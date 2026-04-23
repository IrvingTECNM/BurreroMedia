/**
 * Player Screen — Video Playback (Premium Redesign & Interactive)
 *
 * Full-featured video player with native Animated UI logic,
 * Interactive seekbar, Keyboard shortcuts for Web, Double tap
 * to seek gestures, and native fullscreen API hooking.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { HapticPressable } from '@/components/ui/HapticPressable';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { usePlayerStore } from '@/stores/playerStore';

export default function PlayerScreen() {
  const { url, title, tmdbId, mediaType } = useLocalSearchParams<{ 
    url: string; 
    title: string;
    tmdbId?: string;
    mediaType?: 'movie' | 'tv';
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const { updateProgress } = usePlayerStore();

  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProgressBarHovered, setIsProgressBarHovered] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(console.error);
  }, []);

  // Animation values
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3 seconds of inactivity
  const resetHideControlsTimer = () => {
    setShowControls(true);
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, 3000);
  };

  useEffect(() => {
    resetHideControlsTimer();
    return () => {
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Keyboard Shortcuts (Web equivalent)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent default browser scrolling with spacebar
        if (e.code === 'Space' && e.target === document.body) {
          e.preventDefault();
        }

        if (e.code === 'Space') {
          togglePlay();
        } else if (e.code === 'ArrowLeft') {
          handleSeekDelta(-10000); // -10s
        } else if (e.code === 'ArrowRight') {
          handleSeekDelta(10000); // +10s
        } else if (e.code === 'KeyF') {
          toggleFullscreen();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlaying, duration]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    
    // Periodically save progress
    if (status.isPlaying && tmdbId && mediaType && status.positionMillis % 10000 < 500) {
      updateProgress({
        tmdbId: tmdbId,
        mediaType: mediaType,
        currentTime: status.positionMillis / 1000,
        duration: (status.durationMillis || 0) / 1000,
      });
    }
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    
    if (status.isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    resetHideControlsTimer();
  };

  const handleSeekDelta = async (deltaMs: number) => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPos = Math.max(0, Math.min(status.durationMillis || 0, status.positionMillis + deltaMs));
      await videoRef.current.setPositionAsync(newPos);
      resetHideControlsTimer();
    }
  };

  const handleSeekTo = async (seekRatio: number) => {
    if (!videoRef.current || duration === 0) return;
    const newPos = seekRatio * duration;
    await videoRef.current.setPositionAsync(newPos);
    resetHideControlsTimer();
  };

  const toggleFullscreen = async () => {
    if (Platform.OS === 'web') {
      const el = document.getElementById('burrero-player-wrapper');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      } else {
        el?.requestFullscreen().catch(console.error);
      }
    } else {
      if (!videoRef.current) return;
      await videoRef.current.presentFullscreenPlayer();
    }
  };

  // Double tap detection
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | 'center' | null }>({ time: 0, side: null });
  const handleScreenTap = (e: any, side: 'left' | 'right' | 'center') => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTapRef.current.side === side && now - lastTapRef.current.time < DOUBLE_PRESS_DELAY) {
      // Double tap!
      if (side === 'left') {
        handleSeekDelta(-10000);
      } else if (side === 'right') {
        handleSeekDelta(10000);
      }
      lastTapRef.current = { time: 0, side: null }; // Reset
    } else {
      // Single tap
      lastTapRef.current = { time: now, side };
      if (side === 'center') {
        if (Platform.OS === 'web') {
          togglePlay();
        } else {
          setShowControls(!showControls);
          if (!showControls) resetHideControlsTimer();
        }
      }
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;
  
  const webHoverProps = Platform.OS === 'web' ? {
    onMouseMove: resetHideControlsTimer,
  } : {};

  const progressBarHoverProps = Platform.OS === 'web' ? {
    onHoverIn: () => setIsProgressBarHovered(true),
    onHoverOut: () => setIsProgressBarHovered(false),
  } : {};

  return (
    <View id="burrero-player-wrapper" style={styles.container} {...webHoverProps as any}>
      {/* Background container to prevent clicking out */}
      <View style={StyleSheet.absoluteFill} />

      {/* Video Player */}
      <View style={styles.videoContainer}>
        {Platform.OS === 'web' && (
          <div dangerouslySetInnerHTML={{ __html: `
            <style>
              video {
                object-fit: contain !important;
                width: 100% !important;
                height: 100% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
              }
            </style>
          `}} />
        )}
        <Video
          ref={videoRef}
          source={{ uri: url || '' }}
          style={[styles.video, { width: '100%', height: '100%' }]}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isMuted={isMuted}
          volume={1.0}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {/* Double Tap & Single Tap Interaction Zones */}
        <View style={styles.touchZonesOverlay}>
          <Pressable 
            style={styles.sideZone} 
            onPress={(e) => handleScreenTap(e, 'left')} 
          />
          <Pressable 
            style={styles.centerZone} 
            onPress={(e) => handleScreenTap(e, 'center')} 
          />
          <Pressable 
            style={styles.sideZone} 
            onPress={(e) => handleScreenTap(e, 'right')} 
          />
        </View>

        {/* Animated Controls Overlay */}
        <Animated.View 
          style={[styles.controlsOverlay, { opacity: opacityAnim }]}
          pointerEvents={showControls ? 'box-none' : 'none'}
        >
          {/* Top Gradient & Bar */}
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent']}
            style={[styles.topGradient, { paddingTop: insets.top + Spacing.md }]}
            pointerEvents="box-none"
          >
            <View style={styles.topBar}>
              <HapticPressable onPress={() => router.back()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
              </HapticPressable>
              
              <Text style={styles.playerTitle} numberOfLines={1}>
                {title || 'Reproduciendo'}
              </Text>

              <HapticPressable style={styles.iconBtn}>
                <Ionicons name="flag-outline" size={24} color={Colors.textPrimary} />
              </HapticPressable>
            </View>
          </LinearGradient>

          {/* Bottom Gradient & Bar */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={[styles.bottomGradient, { paddingBottom: insets.bottom + Spacing.lg }]}
            pointerEvents="box-none"
          >
            {/* Interactive Progress Bar */}
            <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm }}>
              <Pressable
                onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
                onPress={(e) => {
                  if (progressBarWidth > 0) {
                    const natEvent = e.nativeEvent as any;
                    const clickX = Platform.OS === 'web' && natEvent.offsetX !== undefined 
                      ? natEvent.offsetX 
                      : natEvent.locationX;
                    handleSeekTo(clickX / progressBarWidth);
                  }
                }}
                style={styles.progressBarHitbox}
                {...progressBarHoverProps as any}
              >
                <View style={[styles.progressBarContainer, isProgressBarHovered && styles.progressBarHovered]}>
                  <View style={styles.progressTrack} />
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  <View style={[styles.progressThumb, { left: `${progress * 100}%`, transform: [{ translateX: -6 }], opacity: isProgressBarHovered ? 1 : 0 }]} />
                </View>
              </Pressable>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
              <View style={styles.bottomLeftControls}>
                <HapticPressable onPress={togglePlay} style={styles.iconBtn}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={Colors.textPrimary} />
                </HapticPressable>

                <HapticPressable onPress={() => handleSeekDelta(-10000)} style={styles.iconBtn}>
                  <Ionicons name="play-back" size={22} color={Colors.textPrimary} />
                </HapticPressable>
                
                <HapticPressable onPress={() => handleSeekDelta(10000)} style={styles.iconBtn}>
                  <Ionicons name="play-forward" size={22} color={Colors.textPrimary} />
                </HapticPressable>

                <HapticPressable onPress={() => setIsMuted(!isMuted)} style={styles.iconBtn}>
                  <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={26} color={Colors.textPrimary} />
                </HapticPressable>

                <Text style={styles.timeText}>
                  {formatTime(position)}<Text style={styles.timeDurationText}> / {formatTime(duration)}</Text>
                </Text>
              </View>

              <View style={styles.bottomRightControls}>
                <HapticPressable onPress={() => setSubtitlesEnabled(!subtitlesEnabled)} style={styles.iconBtn}>
                  <Ionicons 
                    name={subtitlesEnabled ? "chatbox-ellipses" : "chatbox-ellipses-outline"} 
                    size={24} 
                    color={Colors.textPrimary} 
                  />
                </HapticPressable>

                <HapticPressable style={styles.iconBtn}>
                  <Ionicons name="settings-outline" size={24} color={Colors.textPrimary} />
                </HapticPressable>

                <HapticPressable onPress={toggleFullscreen} style={styles.iconBtn}>
                  <Ionicons name="scan-outline" size={22} color={Colors.textPrimary} />
                </HapticPressable>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  touchZonesOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 1,
  },
  extractionContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    zIndex: 5,
    gap: Spacing.md,
  },
  extractionText: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  extractionSubText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
  },
  sideZone: {
    width: '30%',
    height: '100%',
  },
  centerZone: {
    width: '40%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 2,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 3,
  },
  topGradient: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bottomGradient: {
    paddingTop: Spacing.xxxl,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  bottomLeftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bottomRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBtn: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  timeDurationText: {
    color: Colors.textTertiary,
  },
  progressBarHitbox: {
    height: 30, // Taller hitbox for finger accuracy
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarHovered: {
    height: 6,
  },
  progressTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: BorderRadius.round,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    top: '50%',
    marginTop: -7,
  },
});
