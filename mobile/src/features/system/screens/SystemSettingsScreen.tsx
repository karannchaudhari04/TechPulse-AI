import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setTheme, setAmoled } from '../../../store/slices/preferencesSlice';

import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import StorageStatsCard from '../components/StorageStatsCard';
import SyncDashboard from '../components/SyncDashboard';
import { StorageManagerService, StorageStats } from '../storage/StorageManagerService';
import { AnalyticsService } from '../analytics/AnalyticsService';

/**
 * Purpose: Central settings dashboard aggregating theme preference switches,
 * storage breakdowns, offline sync states, and developer parameters.
 */
export default function SystemSettingsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors, typography, spacing } = useTheme();

  const { theme, isAmoled } = useAppSelector(state => state.preferences);

  const [stats, setStats] = useState<StorageStats>({
    imageSizeMb: 12.4,
    feedSizeKb: 0,
    searchSizeKb: 0,
    assistantSizeKb: 0,
    offlineQueueSize: 0,
    totalStorageMb: 12.4,
  });

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);

  const loadStats = async () => {
    const data = await StorageManagerService.getStorageStats();
    setStats(data);
  };

  useEffect(() => {
    loadStats();
    AnalyticsService.trackScreen('SystemSettings');
  }, []);

  const handleClearCache = async (category: 'feed' | 'search' | 'assistant' | 'images' | 'all') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to clear ${category} cache?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await StorageManagerService.clearCacheCategory(category);
            await loadStats();
            Alert.alert('Success', 'Cache cleared successfully.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaWrapper>
      <View style={[styles.navigationBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Go Back">
          <Icon name="arrow-left" provider="feather" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
          System Settings & Performance
        </Text>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Appearance settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            APPEARANCE & THEMES
          </Text>
          
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Dark Mode Theme
            </Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={(val) => {
                dispatch(setTheme(val ? 'dark' : 'light'));
              }}
            />
          </View>

          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              AMOLED Pure Black
            </Text>
            <Switch
              value={isAmoled}
              onValueChange={(val) => {
                dispatch(setAmoled(val));
              }}
            />
          </View>
        </View>

        {/* Notifications preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            NOTIFICATIONS PREFERENCES
          </Text>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Push Alerts & Intelligence Digest
            </Text>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
            />
          </View>
        </View>

        {/* Offline synchronization */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            OFFLINE SYNCHRONIZATION
          </Text>
          <SyncDashboard />
        </View>

        {/* Local Storage Inspector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            STORAGE INSPECTOR
          </Text>
          <StorageStatsCard
            stats={stats}
            onClearCategory={handleClearCache}
          />
        </View>

        {/* Developer Sandbox */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            DEVELOPER SANDBOX
          </Text>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Enable Debug Telemetry Logs
            </Text>
            <Switch
              value={developerMode}
              onValueChange={setDeveloperMode}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  navPlaceholder: {
    width: 40,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
  },
});
