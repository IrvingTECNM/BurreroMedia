import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

export function SkeletonMediaCard({ size = 'md' }: Props) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const dimensions = {
    sm: { width: 120, height: 180 },
    md: { width: 140, height: 210 },
    lg: { width: 160, height: 240 },
  }[size];

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, dimensions]}>
      <Animated.View style={[styles.skeleton, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surfaceLight,
  },
});
