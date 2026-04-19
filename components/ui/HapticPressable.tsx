/**
 * HapticPressable — Premium Touch Feedback
 *
 * A Pressable wrapper that provides haptic feedback, subtle scale animation,
 * and opacity change on press. Following ui-ux-pro-max §2 touch guidelines.
 */
import React, { useCallback } from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Animation } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface HapticPressableProps extends PressableProps {
  hapticType?: 'light' | 'medium' | 'heavy' | 'none';
  scaleOnPress?: number;
  scaleOnHover?: number;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export function HapticPressable({
  hapticType = 'light',
  scaleOnPress = 0.96,
  scaleOnHover = 1.04, // Default hover scale for web
  onPressIn,
  onPressOut,
  children,
  style,
  ...props
}: HapticPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleOnPress, Animation.spring);

      if (hapticType !== 'none') {
        const impactMap = {
          light: Haptics.ImpactFeedbackStyle.Light,
          medium: Haptics.ImpactFeedbackStyle.Medium,
          heavy: Haptics.ImpactFeedbackStyle.Heavy,
        };
        Haptics.impactAsync(impactMap[hapticType]);
      }

      onPressIn?.(e);
    },
    [hapticType, scaleOnPress, onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      // Return to hover scale if running on web and hover exists, else 1
      scale.value = withSpring(1, Animation.spring);
      onPressOut?.(e);
    },
    [onPressOut, scale]
  );
  
  // React Native Web natively supports onHoverIn and onHoverOut on Pressable
  const handleHoverIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleOnHover, Animation.spring);
      // @ts-ignore
      props.onHoverIn?.(e);
    },
    [scaleOnHover, scale, props]
  );

  const handleHoverOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, Animation.spring);
      // @ts-ignore
      props.onHoverOut?.(e);
    },
    [scale, props]
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      // @ts-ignore - RNW specific props
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

export default HapticPressable;
