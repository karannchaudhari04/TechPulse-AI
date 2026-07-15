import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { 
  useGetCollectionsQuery, 
  useCreateCollectionMutation,
  useDeleteCollectionMutation
} from '../api/personalizationApiSlice';

/**
 * Purpose: Manage Collections Screen allowing creation, viewing, and deleting collections folders.
 */
export default function CollectionsScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();

  const { data: collections, isLoading, refetch } = useGetCollectionsQuery();
  const [createCollection] = useCreateCollectionMutation();
  const [deleteCollection] = useDeleteCollectionMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  const handleCreate = async () => {
    if (!newColName.trim()) return;
    try {
      await createCollection({ name: newColName, description: newColDesc }).unwrap();
      setNewColName('');
      setNewColDesc('');
      setModalVisible(false);
      refetch();
    } catch (err) {
      console.error('[Collections] Failed to create collection:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCollection(id).unwrap();
      refetch();
    } catch (err) {
      console.error('[Collections] Failed to delete collection:', err);
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
          Manage Collections
        </Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Add new collection">
          <Icon name="plus" provider="feather" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {collections && collections.length === 0 ? (
        <View style={styles.center}>
          <Icon name="folder" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            No collections created yet. Tap '+' to create your first tech folder!
          </Text>
        </View>
      ) : (
        <FlatList
          data={collections}
          renderItem={({ item }) => (
            <Card variant="standard" style={[styles.colItem, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
              <View style={styles.colDetails}>
                <Text style={[styles.colName, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
                  {item.name}
                </Text>
                {item.description ? (
                  <Text style={[styles.colDesc, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              
              <View style={styles.colActions}>
                <TouchableOpacity onPress={() => navigation.navigate('CollectionDetail', { id: item.id })} style={styles.actionBtn}>
                  <Icon name="eye" provider="feather" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                  <Icon name="trash-2" provider="feather" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          )}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}

      {/* Create Collection Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginBottom: spacing.md }]}>
              Create Collection
            </Text>

            <TextInput
              value={newColName}
              onChangeText={setNewColName}
              placeholder="Collection Name"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, marginBottom: spacing.sm }]}
            />

            <TextInput
              value={newColDesc}
              onChangeText={setNewColDesc}
              placeholder="Description (Optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, marginBottom: spacing.md }]}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outlined"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Create"
                onPress={handleCreate}
                style={{ flex: 1, marginLeft: spacing.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  colItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  colDetails: {
    flex: 1,
    marginRight: 12,
  },
  colName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  colDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  colActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
});
