/**
 * SkeletonLoader — Animated Loading Placeholders
 *
 * Provides shimmer/pulse animation to indicate loading state.
 * Reserves exact layout space to prevent CLS (per ui-ux-pro-max §3).
 */
import React, { useEffect } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, BorderRadius, Animation } from '@/constants/theme';

interface SkeletonProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = BorderRadius.md, style }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1, // infinite
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: Colors.surfaceLight,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton for a media poster card */
export function MediaCardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      <Skeleton width={130} height={195} borderRadius={BorderRadius.md} />
      <Skeleton width={100} height={12} borderRadius={BorderRadius.sm} style={styles.titleSkeleton} />
      <Skeleton width={60} height={10} borderRadius={BorderRadius.sm} style={styles.subtitleSkeleton} />
    </View>
  );
}

/** Skeleton for a full media row */
export function MediaRowSkeleton() {
  return (
    <View style={styles.rowContainer}>
      <Skeleton width={160} height={20} borderRadius={BorderRadius.sm} style={styles.rowTitle} />
      <View style={styles.rowCards}>
        {[1, 2, 3, 4].map((i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

/** Skeleton for the hero banner */
export function HeroBannerSkeleton() {
  return (
    <View style={styles.heroContainer}>
      <Skeleton width="100%" height={450} borderRadius={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginRight: 12,
    width: 130,
  },
  titleSkeleton: {
    marginTop: 8,
  },
  subtitleSkeleton: {
    marginTop: 4,
  },
  rowContainer: {
    marginBottom: 24,
  },
  rowTitle: {
    marginBottom: 12,
    marginLeft: 16,
  },
  rowCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  heroContainer: {
    width: '100%',
  },
});

export default Skeleton;
