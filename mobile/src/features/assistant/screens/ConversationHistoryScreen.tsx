import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../../../store';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { 
  useGetHistoryQuery, 
  useDeleteHistoryMutation 
} from '../api/assistantApiSlice';
import { setActiveConversationId } from '../store/conversationSlice';

/**
 * Purpose: Conversations History selection and deletion screen.
 */
export default function ConversationHistoryScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors, typography, spacing, radius } = useTheme();

  const { data: history, isLoading, refetch } = useGetHistoryQuery();
  const [deleteHistory] = useDeleteHistoryMutation();

  const handleClearAll = async () => {
    try {
      await deleteHistory().unwrap();
      dispatch(setActiveConversationId(null));
      refetch();
    } catch (err) {
      console.error('[ConversationHistory] Failed to clear history:', err);
    }
  };

  const handleSelect = (id: string) => {
    dispatch(setActiveConversationId(id));
    navigation.navigate('Assistant');
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={[styles.navigationBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Go Back">
          <Icon name="arrow-left" provider="feather" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]} numberOfLines={1}>
          Conversations Logs
        </Text>
        {history && history.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Clear all history">
            <Icon name="trash" provider="feather" size={20} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}
      </View>

      {history && history.length === 0 ? (
        <View style={styles.center}>
          <Icon name="message-square" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            No conversation logs found. Start a new session in Assistant!
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => handleSelect(item.conversationId)}
              activeOpacity={0.8}
            >
              <Card variant="standard" style={[styles.historyItem, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md }]}>
                <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.metaText, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
                    {item.messageCount} messages
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.conversationId}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
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
  navButtonPlaceholder: {
    width: 40,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
