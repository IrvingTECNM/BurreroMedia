/**
 * HeroBanner — Full-Width Featured Content Banner
 *
 * Displays a prominent movie/series with backdrop image,
 * gradient overlay, title, description, and action buttons.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { HeroBannerSkeleton } from '@/components/ui/SkeletonLoader';
import {
  Colors,
  Typography,
  Spacing,
  MediaDimensions,
} from '@/constants/theme';
import { TMDBMovie, getBackdropUrl, getTitle, getRatingStars } from '@/lib/tmdb';

// Component-level dynamic dimensions used via useWindowDimensions hook

interface HeroBannerProps {
  item: TMDBMovie | null;
  isLoading?: boolean;
}

export function HeroBanner({ item, isLoading = false }: HeroBannerProps) {
  const router = useRouter();

  if (isLoading || !item) {
    return <HeroBannerSkeleton />;
  }

  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  
  const dynamicHeight = isDesktop
    ? Math.max(Math.min(height * 0.75, width / 2.35), 500)
    : isTablet
    ? Math.min(height * 0.5, 450)
    : MediaDimensions.heroHeight;

  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const rating = getRatingStars(item.vote_average);

  return (
    <View style={[styles.container, { height: dynamicHeight }]}>
      {/* Backdrop Image */}
      <Image
        source={{ uri: getBackdropUrl(item.backdrop_path) }}
        style={styles.backdrop}
        contentFit="cover"
        transition={300}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(10, 10, 15, 0.4)', 'rgba(10, 10, 15, 0.85)', '#0A0A0F']}
        locations={[0, 0.4, 0.75, 1]}
        style={styles.gradient}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Badges */}
        <View style={styles.badges}>
          {item.vote_average > 7 && (
            <Badge text={`★ ${rating.toFixed(1)}`} variant="rating" />
          )}
          <Badge
            text={mediaType === 'tv' ? 'Serie' : 'Película'}
            variant="language"
          />
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {getTitle(item)}
        </Text>

        {/* Overview */}
        <Text style={styles.overview} numberOfLines={3}>
          {item.overview}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Ver Ahora"
            onPress={() =>
              router.push({
                pathname: '/media/[id]',
                params: { id: item.id.toString(), type: mediaType },
              })
            }
            variant="primary"
            size="md"
            icon={<Ionicons name="play" size={18} color={Colors.textPrimary} />}
          />
          <Button
            title="Mi Lista"
            onPress={() => {}}
            variant="secondary"
            size="md"
            icon={<Ionicons name="add" size={18} color={Colors.textPrimary} />}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // Height set dynamically inline
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.hero,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  overview: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondaryButton: {
    marginLeft: Spacing.sm,
  },
});

export default HeroBanner;
