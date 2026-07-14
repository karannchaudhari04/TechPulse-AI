import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Switch } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from '../../../components/common/Icon';
import Button from '../../../components/common/Button';

export interface FilterState {
  sort: 'NEWEST' | 'OLDEST' | 'RELEVANT' | 'IMPORTANCE';
  minImportance: number;
  minCredibility: number;
  followingOnly: boolean;
  unreadOnly: boolean;
  bookmarkedOnly: boolean;
  categories: string[];
}

export interface SearchFilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

const CATEGORIES_LIST = [
  'AI & Machine Learning',
  'Web Development',
  'Mobile Development',
  'Cloud & DevOps',
  'Cybersecurity',
];

/**
 * Purpose: Bottom sheet search filters managing sorting parameters,
 * importance/credibility selectors, and category checks.
 */
export default function SearchFilterBottomSheet({
  visible,
  onClose,
  filters,
  onApply,
}: SearchFilterBottomSheetProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [localFilters, setLocalFilters] = React.useState<FilterState>({ ...filters });

  React.useEffect(() => {
    if (visible) {
      setLocalFilters({ ...filters });
    }
  }, [visible, filters]);

  const toggleCategory = (cat: string) => {
    setLocalFilters(prev => {
      const idx = prev.categories.indexOf(cat);
      const newCats = idx >= 0 
        ? prev.categories.filter(c => c !== cat) 
        : [...prev.categories, cat];
      return { ...prev, categories: newCats };
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const updateSort = (sort: FilterState['sort']) => {
    setLocalFilters(prev => ({ ...prev, sort }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.sheetContent, { backgroundColor: colors.cardBackground, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]}>
          <View style={[styles.headerRow, { borderBottomColor: colors.border, paddingBottom: spacing.sm }]}>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily }]}>
              Search Filters
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Dismiss filters">
              <Icon name="x" provider="feather" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
            {/* Sort options */}
            <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginBottom: spacing.xs }]}>
              Sort By
            </Text>
            <View style={styles.sortRow}>
              {(['RELEVANT', 'NEWEST', 'IMPORTANCE'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  onPress={() => updateSort(option)}
                  style={[styles.sortBtn, { 
                    backgroundColor: localFilters.sort === option ? colors.primary : colors.divider,
                    borderColor: colors.border
                  }]}
                >
                  <Text style={[styles.sortText, { color: localFilters.sort === option ? '#FFF' : colors.textPrimary }]}>
                    {option.toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Importance & Credibility */}
            <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Minimum Importance
            </Text>
            <View style={styles.sortRow}>
              {([0, 50, 80] as const).map(val => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setLocalFilters(prev => ({ ...prev, minImportance: val }))}
                  style={[styles.sortBtn, { 
                    backgroundColor: localFilters.minImportance === val ? colors.primary : colors.divider,
                    borderColor: colors.border
                  }]}
                >
                  <Text style={[styles.sortText, { color: localFilters.minImportance === val ? '#FFF' : colors.textPrimary }]}>
                    {val === 0 ? 'Any' : `${val}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Minimum Credibility
            </Text>
            <View style={styles.sortRow}>
              {([0, 60, 85] as const).map(val => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setLocalFilters(prev => ({ ...prev, minCredibility: val }))}
                  style={[styles.sortBtn, { 
                    backgroundColor: localFilters.minCredibility === val ? colors.primary : colors.divider,
                    borderColor: colors.border
                  }]}
                >
                  <Text style={[styles.sortText, { color: localFilters.minCredibility === val ? '#FFF' : colors.textPrimary }]}>
                    {val === 0 ? 'Any' : `${val}%+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Switches */}
            <View style={[styles.switchRow, { marginTop: spacing.md }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Following Technologies only
              </Text>
              <Switch
                value={localFilters.followingOnly}
                onValueChange={val => setLocalFilters(prev => ({ ...prev, followingOnly: val }))}
                trackColor={{ false: colors.divider, true: colors.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Unread Events only
              </Text>
              <Switch
                value={localFilters.unreadOnly}
                onValueChange={val => setLocalFilters(prev => ({ ...prev, unreadOnly: val }))}
                trackColor={{ false: colors.divider, true: colors.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                Bookmarked only
              </Text>
              <Switch
                value={localFilters.bookmarkedOnly}
                onValueChange={val => setLocalFilters(prev => ({ ...prev, bookmarkedOnly: val }))}
                trackColor={{ false: colors.divider, true: colors.primary }}
              />
            </View>

            {/* Categories */}
            <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Categories
            </Text>
            <View style={styles.categoriesWrap}>
              {CATEGORIES_LIST.map(cat => {
                const selected = localFilters.categories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => toggleCategory(cat)}
                    style={[styles.catChip, { 
                      backgroundColor: selected ? 'rgba(124, 58, 237, 0.08)' : colors.divider,
                      borderColor: selected ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[styles.catText, { color: selected ? colors.primary : colors.textPrimary }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footerRow, { padding: spacing.md }]}>
            <Button
              title="Reset Filters"
              variant="outlined"
              onPress={() => setLocalFilters({
                sort: 'RELEVANT',
                minImportance: 0,
                minCredibility: 0,
                followingOnly: false,
                unreadOnly: false,
                bookmarkedOnly: false,
                categories: [],
              })}
              style={{ flex: 1 }}
            />
            <Button
              title="Apply Filters"
              onPress={handleApply}
              style={{ flex: 1, marginLeft: spacing.sm }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContent: {
    maxHeight: '85%',
    width: '100%',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
});
