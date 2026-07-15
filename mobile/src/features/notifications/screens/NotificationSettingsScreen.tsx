import React from 'react';
import { StyleSheet, View, Text, Switch, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { 
  useGetNotificationPreferencesQuery, 
  useUpdateNotificationPreferencesMutation 
} from '../api/notificationApiSlice';

/**
 * Purpose: Settings screen panel allowing toggle channels preferences and quiet hours.
 */
export default function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();

  const { data: preferences, isLoading } = useGetNotificationPreferencesQuery();
  const [updatePreferences] = useUpdateNotificationPreferencesMutation();

  const handleToggle = async (key: string, currentValue: boolean) => {
    try {
      await updatePreferences({ [key]: !currentValue }).unwrap();
    } catch (err) {
      console.error('[NotificationSettings] Failed to toggle key:', key, err);
    }
  };

  const handleFrequencyChange = async (freq: string) => {
    try {
      await updatePreferences({ frequency: freq as any }).unwrap();
    } catch (err) {
      console.error('[NotificationSettings] Failed to change frequency:', err);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  const prefs = preferences || {
    breakingNews: true,
    securityAlerts: true,
    aiReleases: true,
    frameworkUpdates: true,
    dailyDigest: true,
    weeklyDigest: false,
    emailEnabled: true,
    pushEnabled: true,
    frequency: 'IMMEDIATE',
    maxNotificationsPerDay: 10
  };

  return (
    <SafeAreaWrapper>
      <View style={[styles.navigationBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Go Back">
          <Icon name="arrow-left" provider="feather" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]} numberOfLines={1}>
          Notification Settings
        </Text>
        <View style={styles.navButtonPlaceholder} />
      </View>

      <ScrollView style={{ flex: 1, padding: spacing.md }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily }]}>
          CHANNELS & CATEGORIES
        </Text>

        <Card variant="standard" style={[styles.card, { borderColor: colors.border, marginTop: spacing.xs }]}>
          <View style={styles.switchRow}>
            <View style={styles.labelCol}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Breaking Tech News
              </Text>
              <Text style={[styles.switchDesc, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                Immediate alerts on hot breaking industry news.
              </Text>
            </View>
            <Switch
              value={prefs.breakingNews}
              onValueChange={() => handleToggle('breakingNews', prefs.breakingNews)}
              thumbColor={prefs.breakingNews ? colors.primary : colors.textMuted}
              trackColor={{ true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.labelCol}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Security CVE Alerts
              </Text>
              <Text style={[styles.switchDesc, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                Critical alerts regarding security threats and hotfixes.
              </Text>
            </View>
            <Switch
              value={prefs.securityAlerts}
              onValueChange={() => handleToggle('securityAlerts', prefs.securityAlerts)}
              thumbColor={prefs.securityAlerts ? colors.primary : colors.textMuted}
              trackColor={{ true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.labelCol}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Framework & Library Updates
              </Text>
              <Text style={[styles.switchDesc, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                New version releases alerts for tracked packages.
              </Text>
            </View>
            <Switch
              value={prefs.frameworkUpdates}
              onValueChange={() => handleToggle('frameworkUpdates', prefs.frameworkUpdates)}
              thumbColor={prefs.frameworkUpdates ? colors.primary : colors.textMuted}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.md }]}>
          DELIVERY CHANNELS
        </Text>

        <Card variant="standard" style={[styles.card, { borderColor: colors.border, marginTop: spacing.xs }]}>
          <View style={styles.switchRow}>
            <View style={styles.labelCol}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Push Notifications
              </Text>
            </View>
            <Switch
              value={prefs.pushEnabled}
              onValueChange={() => handleToggle('pushEnabled', prefs.pushEnabled)}
              thumbColor={prefs.pushEnabled ? colors.primary : colors.textMuted}
              trackColor={{ true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <View style={styles.labelCol}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Email Digests
              </Text>
            </View>
            <Switch
              value={prefs.emailEnabled}
              onValueChange={() => handleToggle('emailEnabled', prefs.emailEnabled)}
              thumbColor={prefs.emailEnabled ? colors.primary : colors.textMuted}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.md }]}>
          FREQUENCY TUNING
        </Text>

        <Card variant="standard" style={[styles.card, { borderColor: colors.border, marginTop: spacing.xs, padding: spacing.md, gap: 12, marginBottom: spacing.lg }]}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
            Alerts Dispatch Frequency
          </Text>
          <View style={styles.frequencyRow}>
            {['IMMEDIATE', 'FIFTEEN_MIN', 'HOURLY', 'DAILY'].map((mode) => {
              const active = prefs.frequency === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => handleFrequencyChange(mode)}
                  style={[styles.freqBtn, { 
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : 'transparent'
                  }]}
                >
                  <Text style={[styles.freqText, { 
                    color: active ? '#FFF' : colors.textPrimary,
                    fontFamily: typography.caption.fontFamily 
                  }]}>
                    {mode.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  labelCol: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  freqBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  freqText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
