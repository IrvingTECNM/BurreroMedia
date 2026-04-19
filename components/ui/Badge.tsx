/**
 * Badge — Quality, Language, and Status Badges
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Typography, Spacing } from '@/constants/theme';

type BadgeVariant = 'quality' | 'language' | 'status' | 'recommendation' | 'rating';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  color?: string;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  quality: { bg: 'rgba(229, 9, 20, 0.85)', text: Colors.textPrimary },
  language: { bg: 'rgba(100, 181, 246, 0.2)', text: Colors.info },
  status: { bg: 'rgba(129, 199, 132, 0.2)', text: Colors.success },
  recommendation: { bg: 'rgba(255, 215, 0, 0.2)', text: Colors.accent },
  rating: { bg: 'rgba(255, 215, 0, 0.15)', text: Colors.accent },
};

export function Badge({ text, variant = 'quality', color, style }: BadgeProps) {
  const vc = variantColors[variant];
  const bgColor = color ? `${color}33` : vc.bg;
  const textColor = color || vc.text;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default Badge;
