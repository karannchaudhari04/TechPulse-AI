import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../utils/firebase';
import { markBitesAsViewed, getViewedBiteIds } from '../api/bites';

const PENDING_VIEWED_KEY = '@pending_viewed_bite_ids';
const DAILY_READ_KEY = '@daily_read_bites';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export function useViewedBites() {
  const queryClient = useQueryClient();
  const isSignedIn = !!auth.currentUser;
  const pendingIdsRef = useRef<number[]>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [readTodayIds, setReadTodayIds] = useState<number[]>([]);

  // 1. Fetch viewed bites from backend (only when logged in)
  const { data: viewedBiteIds = [] } = useQuery({
    queryKey: ['viewedBites'],
    queryFn: async () => {
      try {
        const ids = await getViewedBiteIds();
        return ids;
      } catch (err) {
        console.error('[ViewedBites] Fetch failed:', err);
        return [];
      }
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  // Mutation to sync with backend
  const syncMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length === 0) return;
      await markBitesAsViewed(ids);
    },
    onSuccess: (_, variables) => {
      // Update react-query cache with the new viewed IDs
      queryClient.setQueryData<number[]>(['viewedBites'], (old = []) => {
        return [...new Set([...old, ...variables])];
      });
    },
  });

  const syncPendingWithBackend = async () => {
    const idsToSync = [...pendingIdsRef.current];
    if (idsToSync.length === 0) return;

    // Clear in-memory pending to prevent double-sending
    pendingIdsRef.current = [];
    await AsyncStorage.removeItem(PENDING_VIEWED_KEY);

    try {
      await syncMutation.mutateAsync(idsToSync);
    } catch (err) {
      console.error('[ViewedBites] Sync failed. Restoring pending:', err);
      // Restore pending
      pendingIdsRef.current = [...new Set([...pendingIdsRef.current, ...idsToSync])];
      await AsyncStorage.setItem(PENDING_VIEWED_KEY, JSON.stringify(pendingIdsRef.current));
    }
  };

  // Load daily reads and pending from AsyncStorage on mount
  useEffect(() => {
    const loadDailyRead = async () => {
      try {
        const today = getTodayDateString();
        const stored = await AsyncStorage.getItem(DAILY_READ_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.date === today) {
            setReadTodayIds(parsed.ids || []);
            return;
          }
        }
        // If not found or date mismatch, initialize/reset
        await AsyncStorage.setItem(DAILY_READ_KEY, JSON.stringify({ date: today, ids: [] }));
        setReadTodayIds([]);
      } catch (err) {
        console.error('[ViewedBites] Failed to load daily reads:', err);
      }
    };

    const loadPending = async () => {
      try {
        const stored = await AsyncStorage.getItem(PENDING_VIEWED_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as number[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            pendingIdsRef.current = [...new Set([...pendingIdsRef.current, ...parsed])];
            // If signed in, sync immediately
            if (auth.currentUser) {
              await syncPendingWithBackend();
            }
          }
        }
      } catch (err) {
        console.error('[ViewedBites] Failed to load pending from storage:', err);
      }
    };

    loadDailyRead();
    loadPending();
  }, [isSignedIn]);

  // Mark a bite as viewed
  const markAsViewed = async (biteId: number) => {
    // 1. Update daily read progress (for both guest & logged in users)
    try {
      const today = getTodayDateString();
      const stored = await AsyncStorage.getItem(DAILY_READ_KEY);
      let currentDailyIds: number[] = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.date === today) {
          currentDailyIds = parsed.ids || [];
        }
      }
      if (!currentDailyIds.includes(biteId)) {
        currentDailyIds.push(biteId);
        await AsyncStorage.setItem(DAILY_READ_KEY, JSON.stringify({ date: today, ids: currentDailyIds }));
        setReadTodayIds([...currentDailyIds]);
      }
    } catch (err) {
      console.error('[ViewedBites] Failed to update daily reads:', err);
    }

    // If not signed in, we don't sync with backend
    if (!auth.currentUser) return;

    // If already in viewed set or already pending, skip
    if (viewedBiteIds.includes(biteId) || pendingIdsRef.current.includes(biteId)) {
      return;
    }

    pendingIdsRef.current.push(biteId);
    try {
      await AsyncStorage.setItem(PENDING_VIEWED_KEY, JSON.stringify(pendingIdsRef.current));
    } catch (err) {
      console.error('[ViewedBites] Failed to persist pending:', err);
    }

    // If pending list reaches 15, sync to backend
    if (pendingIdsRef.current.length >= 15) {
      await syncPendingWithBackend();
    }
  };

  // AppState change listener for syncing when app goes to background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        if (auth.currentUser && pendingIdsRef.current.length > 0) {
          await syncPendingWithBackend();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isSignedIn]);

  return {
    viewedBiteIds,
    readTodayIds,
    markAsViewed,
    syncPendingWithBackend,
  };
}
