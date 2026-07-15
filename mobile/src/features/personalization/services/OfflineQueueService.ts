import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkTracker } from '../../../utils/network';
import { axiosClient } from '../../../api/axiosClient';

const QUEUE_KEY = 'techpulse_offline_sync_queue';

export interface QueueAction {
  operationId: string;
  type: 'BOOKMARK_ADD' | 'BOOKMARK_REMOVE' | 'COLLECTION_CREATE' | 'COLLECTION_DELETE' | 'COLLECTION_RENAME' | 'EVENT_SAVE' | 'EVENT_REMOVE';
  payload: any;
  timestamp: number;
  retryCount: number;
  lastStatus?: string;
}

/**
 * Purpose: Local queue service persisting mutations while offline.
 * Replays operations sequentially when network connection returns.
 */
export class OfflineQueueService {
  private static subscribers: ((count: number) => void)[] = [];

  static async enqueue(type: QueueAction['type'], payload: any): Promise<string> {
    const queue = await this.getQueue();
    const operationId = Math.random().toString(36).substring(7);
    const newAction: QueueAction = {
      operationId,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(newAction);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    this.notifySubscribers(queue.length);
    return operationId;
  }

  static async getQueue(): Promise<QueueAction[]> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  static subscribe(callback: (count: number) => void): () => void {
    this.subscribers.push(callback);
    this.getPendingCount().then(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private static notifySubscribers(count: number) {
    this.subscribers.forEach(sub => sub(count));
  }

  static startAutoReplay() {
    networkTracker.subscribe(async (isOnline) => {
      if (isOnline) {
        await this.replayQueue();
      }
    });
  }

  static async replayQueue(): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.info(`[OfflineQueue] Replaying ${queue.length} pending actions...`);
    const remainingActions: QueueAction[] = [];

    for (const action of queue) {
      try {
        await this.executeAction(action);
        console.info(`[OfflineQueue] Action ${action.type} (${action.operationId}) synced successfully.`);
      } catch (err: any) {
        console.warn(`[OfflineQueue] Action ${action.type} failed to sync:`, err.message || err);
        action.retryCount++;
        action.lastStatus = err.message || 'Network Fail';
        if (action.retryCount < 5) {
          remainingActions.push(action);
        }
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingActions));
    this.notifySubscribers(remainingActions.length);
  }

  private static async executeAction(action: QueueAction): Promise<any> {
    const { type, payload } = action;
    switch (type) {
      case 'BOOKMARK_ADD':
        return axiosClient.post('/user/bookmark', { eventId: payload.eventId });
      case 'BOOKMARK_REMOVE':
        return axiosClient.delete(`/user/bookmark/${payload.eventId}`);
      case 'COLLECTION_CREATE':
        return axiosClient.post('/user/collections', payload);
      case 'COLLECTION_DELETE':
        return axiosClient.delete(`/user/collections/${payload.collectionId}`);
      case 'COLLECTION_RENAME':
        return axiosClient.put(`/user/collections/${payload.collectionId}`, { name: payload.name });
      case 'EVENT_SAVE':
        return axiosClient.post(`/user/collections/${payload.collectionId}/events`, { eventId: payload.eventId });
      case 'EVENT_REMOVE':
        return axiosClient.delete(`/user/collections/${payload.collectionId}/events/${payload.eventId}`);
      default:
        throw new Error(`Unsupported offline action type: ${type}`);
    }
  }
}
