import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '../../../utils/firebase';
import { useTheme } from '../../../theme';
import { useAuth } from '../hooks/useAuth';
import { completeProfileSchema, CompleteProfileFormData } from '../validation/authValidation';
import { useSavePreferencesMutation, useUpdateProfileMutation } from '../../profile/api/profileApiSlice';
import { useAppDispatch } from '../../../store';
import { updateProfileDetails } from '../../../store/slices/profileSlice';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import { TextInput } from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { Chip } from '../../../components/common/Badge';
import { Toast } from '../../../components/common/NotificationUI';

const AVAILABLE_TOPICS = [
  { id: 'ai', name: 'AI & Machine Learning' },
  { id: 'cloud', name: 'Cloud & DevOps' },
  { id: 'cybersecurity', name: 'Cybersecurity' },
  { id: 'backend', name: 'System Design & Backend' },
  { id: 'mobile', name: 'Mobile Development' },
  { id: 'web', name: 'Web Development' },
  { id: 'data', name: 'Data Science & Analytics' },
  { id: 'blockchain', name: 'Emerging Tech' },
];

/**
 * Purpose: CompleteProfileScreen acting as onboarding interest selection & name setup.
 * Interacts with Spring Boot settings and preferences APIs.
 */
export default function CompleteProfileScreen() {
  const { colors, typography, spacing } = useTheme();
  const { refreshProfile, logout } = useAuth();
  const dispatch = useAppDispatch();
  const [savePreferences] = useSavePreferencesMutation();
  const [updateProfile] = useUpdateProfileMutation();

  const [isLoading, setIsLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      displayName: auth.currentUser?.displayName || '',
      categories: [],
    },
  });

  const selectedCategories = watch('categories');

  const handleTopicPress = (topicName: string) => {
    const current = [...selectedCategories];
    const index = current.indexOf(topicName);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(topicName);
    }
    setValue('categories', current, { shouldValidate: true });
  };

  const onSubmit = async (data: CompleteProfileFormData) => {
    setIsLoading(true);
    try {
      await savePreferences({ categories: data.categories }).unwrap();
      await updateProfile({ displayName: data.displayName }).unwrap();

      dispatch(updateProfileDetails({ 
        displayName: data.displayName, 
        preferences: data.categories,
        isOnboarded: true 
      }));

      await refreshProfile();
    } catch (err: any) {
      setToastMessage(err?.data?.message || err?.message || 'Failed to save settings. Please try again.');
      setToastVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { marginTop: spacing.md }]}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.heading.fontFamily }]}>
            Complete Profile
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
            Tell us your name and select the topics you are interested in.
          </Text>
        </View>

        <Card variant="elevated" style={styles.card}>
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Your Name / Nickname"
                placeholder="John Doe"
                value={value}
                onChangeText={onChange}
                error={errors.displayName?.message}
                disabled={isLoading}
              />
            )}
          />

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.md }]}>
            Topics of Interest
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted, fontFamily: typography.caption.fontFamily, marginBottom: spacing.sm }]}>
            Select at least 1 technology topic to customize your updates feed.
          </Text>

          <View style={styles.topicsContainer}>
            {AVAILABLE_TOPICS.map((topic) => {
              const isSelected = selectedCategories.includes(topic.name);
              return (
                <Chip
                  key={topic.id}
                  label={topic.name}
                  selected={isSelected}
                  onPress={() => handleTopicPress(topic.name)}
                  style={{ margin: 4 }}
                />
              );
            })}
          </View>
          {errors.categories?.message && (
            <Text style={[styles.error, { color: colors.danger, fontFamily: typography.bodySmall.fontFamily }]}>
              {errors.categories.message}
            </Text>
          )}

          <Button
            title="Save & Continue"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            style={{ marginTop: spacing.lg }}
          />

          <Button
            title="Sign Out"
            onPress={logout}
            variant="outlined"
            style={{ marginTop: spacing.sm, borderWidth: 0 }}
            textStyle={{ color: colors.danger }}
            disabled={isLoading}
          />
        </Card>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  error: {
    fontSize: 11,
    marginTop: 8,
  },
});
