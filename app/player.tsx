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
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { HapticPressable } from '@/components/ui/HapticPressable';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { usePlayerStore } from '@/stores/playerStore';
import { StreamResult } from '@/lib/providers/types';

const stableServers = ['vimeos', 'goodstream', 'hlswish', 'streamwish'];

function getPlayerStreamTone(stream?: StreamResult) {
  if (!stream) return { label: 'Servidor', color: Colors.textTertiary, icon: 'radio' as const };
  const lower = `${stream.provider} ${stream.title} ${stream.url}`.toLowerCase();
  if (stream.behaviorHints && !stream.behaviorHints.isDirect) {
    return { label: 'Externo', color: Colors.warning, icon: 'open-outline' as const };
  }
  if (stableServers.some((server) => lower.includes(server))) {
    return { label: stream.url.includes('.m3u8') ? 'HLS estable' : 'Estable', color: Colors.success, icon: 'flash' as const };
  }
  if (stream.url.includes('.m3u8') || stream.url.includes('/api/proxy')) {
    return { label: 'Alta calidad', color: Colors.info, icon: 'radio' as const };
  }
  return { label: 'Alternativo', color: Colors.warning, icon: 'swap-horizontal' as const };
}

export default function PlayerScreen() {
  const { url, title, tmdbId, mediaType } = useLocalSearchParams<{ 
    url: string; 
    title: string;
    tmdbId?: string;
    mediaType?: 'movie' | 'tv';
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const videoRef = useRef<Video>(null);
  const { updateProgress, activeStreams, activeSubtitles } = usePlayerStore();

  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProgressBarHovered, setIsProgressBarHovered] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // The actual URL being played
  const currentUrl = activeStreams.length > 0 
    ? activeStreams[currentStreamIndex]?.url 
    : url;
  const currentStream = activeStreams[currentStreamIndex];
  const isCompact = width < 720;
  const isShort = height < 520;
  const currentStreamTone = getPlayerStreamTone(currentStream);

  // Inject Web Subtitles
  useEffect(() => {
    if (Platform.OS === 'web') {
      const videoElements = document.getElementsByTagName('video');
      if (videoElements.length > 0) {
        const videoElement = videoElements[0];
        // Remove old tracks
        const oldTracks = videoElement.querySelectorAll('track');
        oldTracks.forEach(t => t.remove());

        if (subtitlesEnabled && selectedSubtitle) {
          const track = document.createElement('track');
          track.src = selectedSubtitle;
          track.kind = 'subtitles';
          track.srclang = 'es';
          track.label = 'Subtitles';
          track.default = true;
          
          // Disable native subtitle styling if possible to let CSS handle it
          videoElement.appendChild(track);
          // Force textTracks to show
          if (videoElement.textTracks && videoElement.textTracks.length > 0) {
            videoElement.textTracks[0].mode = 'showing';
          }
        }
      }
    }
  }, [selectedSubtitle, subtitlesEnabled, currentUrl]);

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

  const handleError = (error: string) => {
    console.log('[Player] Error playing stream:', error);
    const failedServer = currentStream?.provider || currentStream?.title || 'Servidor';
    if (activeStreams.length > 0 && currentStreamIndex < activeStreams.length - 1) {
      // There are more streams to try — show error with auto-switch option
      setPlayerError(`"${failedServer}" falló. Cambiando al siguiente servidor...`);
      setIsLoading(false);
      // Auto-switch after 2 seconds
      setTimeout(() => {
        setCurrentStreamIndex(prev => prev + 1);
        setPlayerError(null);
        setErrorCount(0);
        setIsLoading(true);
      }, 2000);
    } else {
      // No more streams
      setPlayerError(`"${failedServer}" falló y no hay más servidores disponibles. Prueba con otra fuente.`);
      setIsLoading(false);
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
          if (showControls) {
            setShowSettingsMenu(false);
            setShowSubtitlesMenu(false);
          } else {
            resetHideControlsTimer();
          }
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
              ::cue {
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                font-family: sans-serif;
                font-size: 1.5rem;
                line-height: 1.5;
                padding: 0.2em 0.5em;
              }
            </style>
          `}} />
        )}
        <Video
          ref={videoRef}
          source={{ uri: currentUrl || '' }}
          style={[styles.video, { width: '100%', height: '100%' }]}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isMuted={isMuted}
          volume={1.0}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={(e) => handleError(e)}
          useNativeControls={false}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            {currentStreamIndex > 0 && (
              <Text style={{ color: 'white', marginTop: Spacing.md }}>
                Cargando servidor alternativo...
              </Text>
            )}
          </View>
        )}

        {/* Error Overlay */}
        {playerError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorTitle}>Error de reproducción</Text>
            <Text style={styles.errorMessage}>{playerError}</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg }}>
              {currentStreamIndex < activeStreams.length - 1 && (
                <Pressable
                  style={styles.errorButton}
                  onPress={() => {
                    setCurrentStreamIndex(prev => prev + 1);
                    setPlayerError(null);
                    setErrorCount(0);
                    setIsLoading(true);
                  }}
                >
                  <Ionicons name="swap-horizontal" size={18} color="white" />
                  <Text style={styles.errorButtonText}>Probar otro servidor</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.errorButton, { backgroundColor: Colors.surface }]}
                onPress={() => {
                  setShowSettingsMenu(true);
                  setPlayerError(null);
                }}
              >
                <Ionicons name="list" size={18} color="white" />
                <Text style={styles.errorButtonText}>Ver servidores</Text>
              </Pressable>
              <Pressable
                style={[styles.errorButton, { backgroundColor: '#444' }]}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={18} color="white" />
                <Text style={styles.errorButtonText}>Volver</Text>
              </Pressable>
            </View>
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
            style={[
              styles.topGradient,
              {
                paddingTop: insets.top + (isCompact ? Spacing.sm : Spacing.md),
                paddingHorizontal: isCompact ? Spacing.md : Spacing.xl,
                paddingBottom: isShort ? Spacing.lg : Spacing.xxl,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.topBar}>
              <HapticPressable onPress={() => router.back()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={28} color={Colors.textPrimary} />
              </HapticPressable>
              
              <Text style={[styles.playerTitle, isCompact && styles.playerTitleCompact]} numberOfLines={isCompact ? 2 : 1}>
                {title || 'Reproduciendo'}
              </Text>

              <HapticPressable style={styles.iconBtn}>
                <Ionicons name="flag-outline" size={24} color={Colors.textPrimary} />
              </HapticPressable>
            </View>
          </LinearGradient>

          {/* Menus */}
          {showSettingsMenu && (
            <View style={[styles.menuContainer, isCompact && styles.menuContainerCompact]}>
              <Text style={styles.menuTitle}>Servidores</Text>
              <ScrollView style={styles.menuList}>
                {activeStreams.map((stream, index) => {
                  const tone = getPlayerStreamTone(stream);
                  return (
                  <Pressable 
                    key={`${stream.provider}-${index}`} 
                    style={[styles.menuItem, currentStreamIndex === index && styles.menuItemActive]}
                    onPress={() => {
                      setCurrentStreamIndex(index);
                      setShowSettingsMenu(false);
                      setIsLoading(true);
                    }}
                  >
                    <Ionicons name={tone.icon} size={20} color={tone.color} />
                    <View style={styles.menuItemCopy}>
                      <Text style={styles.menuItemText} numberOfLines={1}>{stream.provider} / {stream.quality}</Text>
                      <Text style={styles.menuItemSubtext} numberOfLines={1}>{tone.label} / {stream.title || stream.language}</Text>
                    </View>
                    {currentStreamIndex === index && (
                      <View style={[styles.menuStatusBadge, { borderColor: tone.color, backgroundColor: `${tone.color}22` }]}>
                        <Text style={[styles.menuStatusBadgeText, { color: tone.color }]}>Activo</Text>
                      </View>
                    )}
                  </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {showSubtitlesMenu && (
            <View style={[styles.menuContainer, isCompact && styles.menuContainerCompact]}>
              <Text style={styles.menuTitle}>Subtítulos</Text>
              <ScrollView style={styles.menuList}>
                <Pressable 
                  style={[styles.menuItem, !subtitlesEnabled && styles.menuItemActive]}
                  onPress={() => {
                    setSubtitlesEnabled(false);
                    setSelectedSubtitle(null);
                    setShowSubtitlesMenu(false);
                  }}
                >
                  <Ionicons name={!subtitlesEnabled ? "radio-button-on" : "radio-button-off"} size={20} color={!subtitlesEnabled ? Colors.primary : Colors.textPrimary} />
                  <Text style={[styles.menuItemText, { marginLeft: Spacing.sm }]}>Desactivados</Text>
                </Pressable>
                
                {activeSubtitles.map((sub, index) => (
                  <Pressable 
                    key={`sub-${index}`} 
                    style={[styles.menuItem, subtitlesEnabled && selectedSubtitle === sub.url && styles.menuItemActive]}
                    onPress={() => {
                      setSubtitlesEnabled(true);
                      setSelectedSubtitle(sub.url);
                      setShowSubtitlesMenu(false);
                    }}
                  >
                    <Ionicons name={subtitlesEnabled && selectedSubtitle === sub.url ? "radio-button-on" : "radio-button-off"} size={20} color={subtitlesEnabled && selectedSubtitle === sub.url ? Colors.primary : Colors.textPrimary} />
                    <Text style={[styles.menuItemText, { marginLeft: Spacing.sm }]}>{sub.label || sub.language}</Text>
                  </Pressable>
                ))}
                {activeSubtitles.length === 0 && (
                  <Text style={styles.menuItemSubtext}>No hay subtítulos disponibles</Text>
                )}
              </ScrollView>
            </View>
          )}

          {/* Bottom Gradient & Bar */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={[
              styles.bottomGradient,
              {
                paddingBottom: insets.bottom + (isCompact ? Spacing.md : Spacing.lg),
                paddingTop: isShort ? Spacing.xl : Spacing.xxxl,
              },
            ]}
            pointerEvents="box-none"
          >
            {/* Interactive Progress Bar */}
            <View style={{ paddingHorizontal: isCompact ? Spacing.md : Spacing.xl, marginBottom: Spacing.sm }}>
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
            <View style={[styles.bottomBar, isCompact && styles.bottomBarCompact]}>
              {isCompact && currentStream && (
                <View style={styles.mobileStreamPill}>
                  <Ionicons name={currentStreamTone.icon} size={14} color={currentStreamTone.color} />
                  <Text style={styles.mobileStreamText} numberOfLines={1}>
                    {currentStream.provider} / {currentStream.quality} / {currentStreamTone.label}
                  </Text>
                </View>
              )}
              <View style={[styles.bottomLeftControls, isCompact && styles.bottomControlsCompact]}>
                <HapticPressable onPress={togglePlay} style={styles.iconBtn}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={Colors.textPrimary} />
                </HapticPressable>

                <HapticPressable onPress={() => handleSeekDelta(-10000)} style={styles.iconBtn}>
                  <Ionicons name="play-back" size={22} color={Colors.textPrimary} />
                </HapticPressable>
                
                <HapticPressable onPress={() => handleSeekDelta(10000)} style={styles.iconBtn}>
                  <Ionicons name="play-forward" size={22} color={Colors.textPrimary} />
                </HapticPressable>

                {!isCompact && (
                <HapticPressable onPress={() => setIsMuted(!isMuted)} style={styles.iconBtn}>
                  <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={26} color={Colors.textPrimary} />
                </HapticPressable>
                )}

                <Text style={styles.timeText}>
                  {formatTime(position)}<Text style={styles.timeDurationText}> / {formatTime(duration)}</Text>
                </Text>
              </View>

              <View style={[styles.bottomRightControls, isCompact && styles.bottomControlsCompact]}>
                <HapticPressable 
                  onPress={() => {
                    setShowSubtitlesMenu(!showSubtitlesMenu);
                    setShowSettingsMenu(false);
                    resetHideControlsTimer();
                  }} 
                  style={styles.iconBtn}
                >
                  <Ionicons 
                    name={subtitlesEnabled ? "chatbox-ellipses" : "chatbox-ellipses-outline"} 
                    size={24} 
                    color={subtitlesEnabled ? Colors.primary : Colors.textPrimary} 
                  />
                </HapticPressable>

                <HapticPressable 
                  onPress={() => {
                    setShowSettingsMenu(!showSettingsMenu);
                    setShowSubtitlesMenu(false);
                    resetHideControlsTimer();
                  }} 
                  style={styles.iconBtn}
                >
                  <Ionicons 
                    name={showSettingsMenu ? "settings" : "settings-outline"} 
                    size={24} 
                    color={showSettingsMenu ? Colors.primary : Colors.textPrimary} 
                  />
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
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 10,
    paddingHorizontal: Spacing.xxl,
  },
  errorTitle: {
    ...Typography.h3,
    color: '#FF6B6B',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 500,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  errorButtonText: {
    ...Typography.bodySmall,
    color: 'white',
    fontWeight: '600',
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
  playerTitleCompact: {
    ...Typography.bodySmall,
    lineHeight: 18,
    marginHorizontal: Spacing.sm,
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
  bottomBarCompact: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.md,
    alignItems: 'stretch',
    gap: Spacing.sm,
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
  bottomControlsCompact: {
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
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
  menuContainer: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.xl,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: 250,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  menuContainerCompact: {
    left: Spacing.md,
    right: Spacing.md,
    bottom: 118,
    width: undefined,
    maxHeight: 260,
  },
  menuTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: Spacing.sm,
  },
  menuList: {
    flexGrow: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    minHeight: 44,
    gap: Spacing.sm,
  },
  menuItemActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },
  menuItemText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
  menuItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuItemSubtext: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  mobileStreamPill: {
    alignSelf: 'center',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(20, 20, 32, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.24)',
  },
  mobileStreamText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    maxWidth: 220,
  },
  menuStatusBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  menuStatusBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
