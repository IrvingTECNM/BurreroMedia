/**
 * BurreroMedia Design System
 * Inspired by Netflix/streaming apps — dark-first, premium feel.
 * Follows ui-ux-pro-max skill guidelines for semantic tokens,
 * spacing rhythm (8dp), and accessible contrast ratios.
 */

export const Colors = {
  // Core brand
  primary: '#E50914',
  primaryDark: '#B20710',
  primaryLight: '#FF3D47',

  // Accent
  accent: '#FFD700',
  accentDark: '#E5C100',

  // Backgrounds (dark-first)
  background: '#0A0A0F',
  surface: '#141420',
  surfaceLight: '#1C1C2E',
  surfaceElevated: '#242438',
  surfaceMuted: '#101019',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textTertiary: '#6B6B80',
  textInverse: '#0A0A0F',

  // Semantic
  success: '#00C853',
  warning: '#FFB300',
  error: '#FF453A',
  info: '#64B5F6',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  scrim: 'rgba(0, 0, 0, 0.5)',

  // Border / Divider
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',
  divider: 'rgba(255, 255, 255, 0.06)',

  // Status
  watching: '#4FC3F7',
  wantToWatch: '#FFB74D',
  watched: '#81C784',
} as const;

export const Gradients = {
  primary: ['#E50914', '#B20710'],
  hero: ['transparent', 'rgba(10, 10, 15, 0.6)', '#0A0A0F'],
  card: ['transparent', 'rgba(10, 10, 15, 0.95)'],
  surface: ['#141420', '#0A0A0F'],
} as const;

export const Spacing = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 24px */
  xl: 24,
  /** 32px */
  xxl: 32,
  /** 48px */
  xxxl: 48,
  /** 64px */
  huge: 64,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 16,
  xxl: 24,
  pill: 999,
  round: 9999,
} as const;

export const Typography = {
  // Font family — Inter via Google Fonts
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },

  // Type scale with line heights (per ui-ux-pro-max §6)
  hero: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const Animation = {
  // Per ui-ux-pro-max §7: 150-300ms micro-interactions
  fast: 150,
  normal: 250,
  slow: 350,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 0.8,
  },
} as const;

// Media card dimensions
export const MediaDimensions = {
  posterWidth: 130,
  posterHeight: 195,
  posterWidthLg: 160,
  posterHeightLg: 240,
  backdropHeight: 220,
  heroHeight: 450,
} as const;

export default {
  Colors,
  Gradients,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  Animation,
  MediaDimensions,
};
