import React from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { useGetKnowledgeGraphQuery } from '../api/intelligenceApiSlice';
import Icon from '../../../components/common/Icon';
import GraphNode from '../components/GraphNode';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import { RefreshControl } from 'react-native';

/**
 * Purpose: Visual knowledge graph relations mapping screen.
 */
export default function KnowledgeGraphScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();

  const { data: graph, isLoading, refetch } = useGetKnowledgeGraphQuery();

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
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
          Ecosystem Knowledge Graph
        </Text>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.md }} 
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <Text style={[styles.introText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginBottom: spacing.md }]}>
          Explore how modern technologies, languages, and security alerts connect:
        </Text>

        {graph && graph.nodes && graph.nodes.length > 0 ? (
          <View style={styles.nodesGrid}>
            {graph.nodes.map((node) => (
              <GraphNode
                key={node.id}
                id={node.id}
                label={node.label}
                type={node.type}
                onPress={() => {
                  if (node.type === 'technology') {
                    navigation.navigate('Technology', { id: node.id });
                  } else if (node.type === 'company') {
                    navigation.navigate('Company', { id: node.id });
                  }
                }}
              />
            ))}
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={{ color: colors.textSecondary }}>No graph data available.</Text>
          </View>
        )}
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
  introText: {
    fontSize: 13,
    lineHeight: 18,
  },
  nodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});
