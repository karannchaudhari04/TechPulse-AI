import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../store';
import { unpinTechnology, unpinCompany } from '../store/workspaceSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import BriefGenerator from '../components/BriefGenerator';
import { SafeAreaWrapper } from '../../../components/common/Layout';

/**
 * Purpose: Central developer workspace panel integrating custom briefs generators
 * and pinned items logs.
 */
export default function WorkspaceScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors, typography, spacing, radius } = useTheme();

  const { pinnedTechnologies, pinnedCompanies } = useAppSelector(state => state.workspace);

  return (
    <SafeAreaWrapper>
      <View style={[styles.navigationBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Go Back">
          <Icon name="arrow-left" provider="feather" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
          Developer Research Workspace
        </Text>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Brief Generator Panel */}
        <BriefGenerator />

        {/* Pinned Technologies */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            PINNED TECHNOLOGIES ({pinnedTechnologies.length})
          </Text>
          {pinnedTechnologies.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: typography.bodyMedium.fontFamily }]}>
              No pinned technologies yet.
            </Text>
          ) : (
            pinnedTechnologies.map(techId => (
              <Card key={techId} variant="standard" style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.sm, padding: spacing.sm }]}>
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => navigation.navigate('Technology', { id: techId })} style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                      {techId.toUpperCase()} Details
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => dispatch(unpinTechnology(techId))} accessibilityRole="button" accessibilityLabel={`Unpin ${techId}`}>
                    <Icon name="trash" provider="feather" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Pinned Companies */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            PINNED COMPANIES ({pinnedCompanies.length})
          </Text>
          {pinnedCompanies.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: typography.bodyMedium.fontFamily }]}>
              No pinned companies yet.
            </Text>
          ) : (
            pinnedCompanies.map(compId => (
              <Card key={compId} variant="standard" style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.sm, padding: spacing.sm }]}>
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => navigation.navigate('Company', { id: compId })} style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                      {compId.toUpperCase()} Engineering Blog
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => dispatch(unpinCompany(compId))} accessibilityRole="button" accessibilityLabel={`Unpin ${compId}`}>
                    <Icon name="trash" provider="feather" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
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
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    marginVertical: 6,
  },
  itemCard: {
    borderWidth: 1,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
