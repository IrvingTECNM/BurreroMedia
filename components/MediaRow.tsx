/**
 * MediaRow — Horizontal Scrollable Row of Media Cards
 *
 * Netflix-style section with a title and horizontally
 * scrollable posters. Supports loading skeletons.
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MediaCard } from '@/components/MediaCard';
import { MediaCardSkeleton } from '@/components/ui/SkeletonLoader';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { TMDBMovie } from '@/lib/tmdb';

interface MediaRowProps {
  title: string;
  data: TMDBMovie[];
  isLoading?: boolean;
  icon?: React.ReactNode;
  cardSize?: 'sm' | 'lg';
}

export function MediaRow({
  title,
  data,
  isLoading = false,
  icon,
  cardSize = 'sm',
}: MediaRowProps) {
  if (!isLoading && data.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[1, 2, 3, 4].map((i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MediaCard item={item} size={cardSize} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
  },
});

export default MediaRow;
