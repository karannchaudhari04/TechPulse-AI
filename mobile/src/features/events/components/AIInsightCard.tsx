import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { Divider } from '../../../components/common/Layout';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapseSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

function CollapseSection({ title, icon, children }: CollapseSectionProps) {
  const { colors, typography, spacing } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={[styles.sectionContainer, { borderBottomColor: colors.border }]}>
      <TouchableOpacity 
        onPress={toggleSection} 
        activeOpacity={0.7} 
        style={[styles.headerRow, { paddingVertical: spacing.sm }]}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${title}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.titleWithIcon}>
          <Icon name={icon} provider="feather" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginLeft: spacing.xs }]}>
            {title}
          </Text>
        </View>
        <Icon 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          provider="feather" 
          size={18} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.contentBody, { paddingBottom: spacing.sm }]}>
          {children}
        </View>
      )}
    </View>
  );
}

interface AIInsightCardProps {
  technicalImpact: string;
  developerImpact: string;
  enterpriseImpact: string;
  migrationNotes: string | null;
  breakingChanges: string | null;
  securityNotes: string | null;
  timeline: { title: string; date: string; description: string }[];
  knowledgeGraph: { subject: string; relation: string; object: string }[];
}

/**
 * Purpose: Collapsible AI-generated Knowledge Graph and Event Timeline card.
 */
export default function AIInsightCard({
  technicalImpact,
  developerImpact,
  enterpriseImpact,
  migrationNotes,
  breakingChanges,
  securityNotes,
  timeline,
  knowledgeGraph,
}: AIInsightCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <Card variant="standard" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md }}>
      <Text style={[styles.cardHeader, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, paddingBottom: spacing.xs }]}>
        AI Synthesis Insights
      </Text>
      <Divider style={{ marginVertical: 0 }} />

      <CollapseSection title="Technical Impact" icon="cpu">
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
          {technicalImpact}
        </Text>
      </CollapseSection>

      <CollapseSection title="Developer & Enterprise Impact" icon="users">
        <Text style={[styles.subTitleText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily, fontWeight: 'bold' }]}>
          Developer Impact:
        </Text>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginBottom: spacing.xs }]}>
          {developerImpact}
        </Text>
        <Text style={[styles.subTitleText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily, fontWeight: 'bold' }]}>
          Enterprise Impact:
        </Text>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
          {enterpriseImpact}
        </Text>
      </CollapseSection>

      {(migrationNotes || breakingChanges) && (
        <CollapseSection title="Migration & Breaking Changes" icon="alert-triangle">
          {breakingChanges && (
            <View style={{ marginBottom: spacing.xs }}>
              <Text style={[styles.subTitleText, { color: colors.danger, fontFamily: typography.bodyMedium.fontFamily, fontWeight: 'bold' }]}>
                ⚠️ Breaking Changes:
              </Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
                {breakingChanges}
              </Text>
            </View>
          )}
          {migrationNotes && (
            <View>
              <Text style={[styles.subTitleText, { color: colors.primary, fontFamily: typography.bodyMedium.fontFamily, fontWeight: 'bold' }]}>
                🔧 Migration Guidelines:
              </Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
                {migrationNotes}
              </Text>
            </View>
          )}
        </CollapseSection>
      )}

      {securityNotes && (
        <CollapseSection title="Security Updates & CVEs" icon="shield">
          <Text style={[styles.bodyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
            {securityNotes}
          </Text>
        </CollapseSection>
      )}

      {timeline && timeline.length > 0 && (
        <CollapseSection title="Chronological Timeline" icon="calendar">
          {timeline.map((item, index) => (
            <View key={index} style={[styles.timelineItem, { marginBottom: spacing.sm }]}>
              <View style={styles.timelineHeader}>
                <Text style={[styles.timelineDate, { color: colors.accent, fontFamily: typography.caption.fontFamily }]}>
                  {item.date}
                </Text>
                <Text style={[styles.timelineTitle, { color: colors.textPrimary, fontFamily: typography.bodySmall.fontFamily, fontWeight: 'bold' }]}>
                  {item.title}
                </Text>
              </View>
              <Text style={[styles.timelineDesc, { color: colors.textSecondary, fontFamily: typography.bodySmall.fontFamily }]}>
                {item.description}
              </Text>
            </View>
          ))}
        </CollapseSection>
      )}

      {knowledgeGraph && knowledgeGraph.length > 0 && (
        <CollapseSection title="Knowledge Graph Map" icon="git-merge">
          {knowledgeGraph.map((item, index) => (
            <View key={index} style={[styles.kgItem, { backgroundColor: colors.divider, borderRadius: radius.xs, marginVertical: 2, padding: spacing.xs }]}>
              <Text style={[styles.kgText, { color: colors.textPrimary, fontFamily: typography.caption.fontFamily }]}>
                <Text style={{ fontWeight: 'bold', color: colors.primary }}>{item.subject}</Text>
                {' '}{item.relation.toLowerCase()}{' '}
                <Text style={{ fontWeight: 'bold', color: colors.accent }}>{item.object}</Text>
              </Text>
            </View>
          ))}
        </CollapseSection>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContainer: {
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentBody: {
    width: '100%',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  subTitleText: {
    fontSize: 13,
    marginTop: 6,
  },
  timelineItem: {
    width: '100%',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineDate: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  timelineTitle: {
    fontSize: 12,
  },
  timelineDesc: {
    fontSize: 12,
    marginLeft: 8,
    marginTop: 2,
  },
  kgItem: {
    width: '100%',
  },
  kgText: {
    fontSize: 12,
  },
});
