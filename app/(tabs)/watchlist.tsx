/**
 * Watchlist Screen — Personal Movie/Series List
 *
 * Organized by status tabs: Want to Watch, Watching, Watched.
 * Data persisted in Supabase.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

type WatchlistTab = 'want_to_watch' | 'watching' | 'watched';

const TABS: { key: WatchlistTab; label: string; icon: string }[] = [
  { key: 'want_to_watch', label: 'Quiero Ver', icon: 'bookmark-outline' },
  { key: 'watching', label: 'Viendo', icon: 'play-circle-outline' },
  { key: 'watched', label: 'Vistas', icon: 'checkmark-circle-outline' },
];

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<WatchlistTab>('want_to_watch');

  const contentMaxWidth = Platform.OS === 'web' && width > 1200 ? 1200 : '100%';
  const alignSelf = Platform.OS === 'web' && width > 1200 ? 'center' : 'auto';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: alignSelf as any, flex: 1 }}>
        {/* Header */}
      <Text style={styles.headerTitle}>Mi Lista</Text>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? Colors.primary : Colors.textTertiary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Empty State */}
      <View style={styles.emptyContainer}>
        <Ionicons
          name="film-outline"
          size={64}
          color={Colors.textTertiary}
        />
        <Text style={styles.emptyTitle}>Tu lista está vacía</Text>
        <Text style={styles.emptySubtitle}>
          Explora el catálogo y agrega películas o series que quieras ver
        </Text>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 100,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
