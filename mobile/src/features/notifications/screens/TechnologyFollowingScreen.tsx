import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { 
  useGetFollowedTechnologiesQuery, 
  useFollowTechnologyMutation, 
  useUnfollowTechnologyMutation 
} from '../api/recommendationApiSlice';
import { useNotificationAnalytics } from '../hooks/useNotificationAnalytics';

/**
 * Purpose: Tracked Technologies preference list screen.
 * Resolves followed lists and follow/unfollow mutation options.
 */
export default function TechnologyFollowingScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing, radius } = useTheme();
  const analytics = useNotificationAnalytics();

  const [newTech, setNewTech] = useState('');
  const { data: followedTechs, isLoading, refetch } = useGetFollowedTechnologiesQuery();
  const [followTech] = useFollowTechnologyMutation();
  const [unfollowTech] = useUnfollowTechnologyMutation();

  const handleFollow = async () => {
    if (!newTech.trim()) return;
    try {
      await followTech({ name: newTech.trim() }).unwrap();
      analytics.trackTechnologyFollowChanged(newTech.trim(), true);
      setNewTech('');
      refetch();
    } catch (err) {
      console.error('[TechnologyFollowing] Failed to follow tech:', err);
    }
  };

  const handleUnfollow = async (id: string, name: string) => {
    try {
      await unfollowTech(id).unwrap();
      analytics.trackTechnologyFollowChanged(name, false);
      refetch();
    } catch (err) {
      console.error('[TechnologyFollowing] Failed to untrack tech:', err);
    }
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
          Tracked Technologies
        </Text>
        <View style={styles.navButtonPlaceholder} />
      </View>

      <View style={[styles.inputContainer, { padding: spacing.md }]}>
        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            value={newTech}
            onChangeText={setNewTech}
            placeholder="Add technology to follow (e.g. Kotlin)..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}
          />
          <TouchableOpacity onPress={handleFollow} style={[styles.followAddBtn, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel="Follow new technology">
            <Text style={[styles.followAddText, { fontFamily: typography.caption.fontFamily }]}>
              FOLLOW
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {followedTechs && followedTechs.length === 0 ? (
        <View style={styles.center}>
          <Icon name="cpu" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            You aren't tracking any technologies yet. Add one above!
          </Text>
        </View>
      ) : (
        <FlatList
          data={followedTechs}
          renderItem={({ item }) => (
            <Card variant="standard" style={[styles.techItem, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md }]}>
              <View style={styles.techDetails}>
                <Text style={[styles.techName, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
                  {item.name}
                </Text>
                <Text style={[styles.techDate, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                  Tracking status: {item.trendStatus}
                </Text>
              </View>
              <Button
                title="Untrack"
                variant="outlined"
                onPress={() => handleUnfollow(item.id, item.name)}
                style={{ minHeight: 36, paddingVertical: 6 }}
              />
            </Card>
          )}
          keyExtractor={(item) => item.id}
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
  inputContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    height: 48,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 13,
  },
  followAddBtn: {
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followAddText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderWidth: 1,
  },
  techDetails: {
    flex: 1,
    marginRight: 16,
  },
  techName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  techDate: {
    fontSize: 11,
    marginTop: 2,
  },
});
