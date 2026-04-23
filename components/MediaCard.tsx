/**
 * MediaCard — Poster Card Component
 *
 * Displays a movie/series poster with title, rating, and optional
 * recommendation badge. Uses expo-image for optimized loading.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HapticPressable } from '@/components/ui/HapticPressable';
import {
  Colors,
  BorderRadius,
  Typography,
  Spacing,
  Shadows,
  MediaDimensions,
} from '@/constants/theme';
import { TMDBMovie, getImageUrl, getTitle, getReleaseYear, getRatingStars } from '@/lib/tmdb';

interface MediaCardProps {
  item: TMDBMovie;
  size?: 'sm' | 'lg';
  recommendedBy?: string;
  showRating?: boolean;
  progress?: number; // 0 to 1
}

export function MediaCard({
  item,
  size = 'sm',
  recommendedBy,
  showRating = true,
  progress,
}: MediaCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const isLarge = size === 'lg';
  const width = isLarge ? MediaDimensions.posterWidthLg : MediaDimensions.posterWidth;
  const height = isLarge ? MediaDimensions.posterHeightLg : MediaDimensions.posterHeight;
  const imageSize = isLarge ? 'w342' : 'w185';
  const rating = getRatingStars(item.vote_average);
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');

  const handlePress = () => {
    router.push({
      pathname: '/media/[id]',
      params: { id: item.id.toString(), type: mediaType },
    });
  };

  const hoverProps = Platform.OS === 'web' ? {
    onHoverIn: () => setIsHovered(true),
    onHoverOut: () => setIsHovered(false),
  } : {};

  return (
    <HapticPressable 
      onPress={handlePress} 
      style={[styles.container, { width }]}
      {...hoverProps as any}
    >
      <View style={[
        styles.posterContainer, 
        { width, height }, 
        Shadows.md,
        isHovered && styles.posterHovered
      ]}>
        <Image
          source={{ uri: getImageUrl(item.poster_path, imageSize) }}
          style={[
            styles.poster, 
            { width, height },
            Platform.OS === 'web' && { transition: 'transform 0.3s ease' } as any,
            isHovered && Platform.OS === 'web' && { transform: [{ scale: 1.05 }] }
          ]}
          contentFit="cover"
          transition={250}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />

        {/* Progress Bar Overlay */}
        {progress !== undefined && progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
        )}

        {/* Rating badge */}

        {showRating && item.vote_average > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color={Colors.accent} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Recommendation badge */}
        {recommendedBy && (
          <View style={styles.recommendBadge}>
            <Ionicons name="heart" size={10} color={Colors.primary} />
            <Text style={styles.recommendText} numberOfLines={1}>
              {recommendedBy}
            </Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {getTitle(item)}
      </Text>

      {/* Year */}
      <Text style={styles.year}>{getReleaseYear(item)}</Text>
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.md,
  },
  posterContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  posterHovered: {
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  poster: {
    borderRadius: BorderRadius.md,
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.accent,
    fontWeight: '700',
    fontSize: 10,
  },
  recommendBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  recommendText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontSize: 10,
    flex: 1,
  },
  title: {
    ...Typography.caption,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  year: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
});


export default MediaCard;
