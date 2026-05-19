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
  progressMap?: Record<string, number>;
}

export function MediaRow({
  title,
  data,
  isLoading = false,
  icon,
  cardSize = 'sm',
  progressMap,
}: MediaRowProps) {
  if (!isLoading && data.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
        </View>
        {!isLoading && data.length > 0 && (
          <Text style={styles.count}>{data.length}</Text>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString() + (item.media_type || '')}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MediaCard 
              item={item} 
              size={cardSize} 
              progress={progressMap?.[item.id.toString()]}
            />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  count: {
    ...Typography.caption,
    color: Colors.textTertiary,
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
