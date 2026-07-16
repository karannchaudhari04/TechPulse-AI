import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme';
import { OfflineQueueService, QueueAction } from '../../personalization/services/OfflineQueueService';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';
import Button from '../../../components/common/Button';

/**
 * Purpose: Replay synchronization dashboard showing pending offline mutations queues.
 */
export default function SyncDashboard() {
  const { colors, spacing, radius, typography } = useTheme();
  const [queue, setQueue] = useState<QueueAction[]>([]);
  const [syncing, setSyncing] = useState(false);

  const fetchQueue = async () => {
    const list = await OfflineQueueService.getQueue();
    setQueue(list);
  };

  useEffect(() => {
    fetchQueue();
    const unsubscribe = OfflineQueueService.subscribe(() => {
      fetchQueue();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await OfflineQueueService.replayQueue();
      await fetchQueue();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
          Offline Sync Queue ({queue.length})
        </Text>
        {queue.length > 0 && (
          <Button
            title={syncing ? 'Syncing...' : 'Sync Now'}
            onPress={handleForceSync}
            disabled={syncing}
            style={{ minHeight: 32, paddingVertical: 4 }}
          />
        )}
      </View>

      {queue.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.divider, borderRadius: radius.md, padding: spacing.md }]}>
          <Icon name="check-circle" provider="feather" size={24} color={colors.success} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            All actions synchronized successfully. No pending sync actions.
          </Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          renderItem={({ item }) => (
            <Card variant="standard" style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.sm, padding: spacing.sm }]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.actionType, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
                  {item.type}
                </Text>
                <Text style={[styles.time, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              {item.lastStatus && (
                <Text style={[styles.statusText, { color: colors.danger, fontFamily: typography.caption.fontFamily, marginTop: spacing.xxs }]}>
                  Error: {item.lastStatus} (Retries: {item.retryCount}/5)
                </Text>
              )}
            </Card>
          )}
          keyExtractor={(item) => item.operationId}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  itemCard: {
    borderWidth: 1,
    marginVertical: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionType: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
