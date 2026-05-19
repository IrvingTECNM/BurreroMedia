/**
 * Media Detail Screen — Movie/Series Detail View
 *
 * Full detail page with backdrop, cast, ratings, stream sources
 * from providers, and social actions (recommend, add to list).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { HapticPressable } from '@/components/ui/HapticPressable';
import { RecommendModal } from '@/components/RecommendModal';
import { MediaRow } from '@/components/MediaRow';
import { queryKeys } from '@/lib/query-client';
import {
  getDetails,
  getSeasonDetails,
  getBackdropUrl,
  getImageUrl,
  getTitle,
  getReleaseYear,
  getRatingStars,
  MediaType,
  TMDBSeason,
} from '@/lib/tmdb';
import { providerManager } from '@/lib/providers/providerManager';
import { StreamResult } from '@/lib/providers/types';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '@/constants/theme';
import { useProvidersStore } from '@/stores/providersStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useDownloadStore } from '@/stores/downloadStore';
import { downloadManager } from '@/lib/downloadManager';
import { ensureSupabaseSession, supabase } from '@/lib/supabase';

// Cinematic ratio calculated dynamically in component

const qualityOrder: Record<string, number> = {
  '4K': 4,
  '1080p': 3,
  '720p': 2,
  '480p': 1,
  Unknown: 0,
};

const preferredServerOrder = [
  'vimeos',
  'goodstream',
  'hlswish',
  'streamwish',
  'filelions',
  'filemoon',
  'streamtape',
  'streamsb',
  'doodstream',
  'voe',
];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const serverProfiles: Record<string, { label: string; badge: string; color: string; score: number; icon: IoniconName }> = {
  vimeos: { label: 'Vimeos', badge: 'Muy estable', color: Colors.success, score: 42, icon: 'flash' },
  goodstream: { label: 'Goodstream', badge: 'Muy estable', color: Colors.success, score: 40, icon: 'flash' },
  hlswish: { label: 'HLSWish', badge: 'HLS estable', color: Colors.success, score: 38, icon: 'radio' },
  streamwish: { label: 'Streamwish', badge: 'HLS estable', color: Colors.success, score: 34, icon: 'radio' },
  filelions: { label: 'Filelions', badge: 'Buena opcion', color: Colors.info, score: 28, icon: 'play-circle' },
  filemoon: { label: 'Filemoon', badge: 'Buena opcion', color: Colors.info, score: 26, icon: 'play-circle' },
  streamtape: { label: 'Streamtape', badge: 'Alternativo', color: Colors.warning, score: 18, icon: 'swap-horizontal' },
  streamsb: { label: 'StreamSB', badge: 'Alternativo', color: Colors.warning, score: 16, icon: 'swap-horizontal' },
  doodstream: { label: 'Doodstream', badge: 'Variable', color: Colors.warning, score: 10, icon: 'time' },
  voe: { label: 'Voe', badge: 'Externo', color: Colors.textTertiary, score: 4, icon: 'open-outline' },
};

function getServerKey(stream: StreamResult): string | null {
  const lower = `${stream.provider} ${stream.title} ${stream.url}`.toLowerCase();
  return preferredServerOrder.find((name) => lower.includes(name)) || null;
}

function getServerProfile(stream: StreamResult) {
  const key = getServerKey(stream);
  return key ? serverProfiles[key] : null;
}

function getStreamScore(stream: StreamResult): number {
  const hints = stream.behaviorHints;
  const serverScore = getServerProfile(stream)?.score || 0;
  const qualityScore = (qualityOrder[stream.quality] || 0) * 20;
  const playableScore = stream.type === 'direct' ? 80 : stream.type === 'embed' ? 25 : 5;
  const proxyScore = stream.url.includes('/api/proxy') ? 35 : 0;
  const hlsScore = stream.url.includes('.m3u8') ? 20 : 0;
  const languageScore = stream.language === 'es-lat' ? 18 : stream.language === 'es-es' ? 12 : stream.language === 'en-sub' ? 8 : 0;
  const externalPenalty = hints && !hints.isDirect ? -45 : 0;
  const downloadPenalty = stream.isDownload ? -100 : 0;

  return qualityScore + playableScore + proxyScore + hlsScore + languageScore + serverScore + externalPenalty + downloadPenalty;
}

function sortStreamsForUser(streams: StreamResult[]): StreamResult[] {
  const seen = new Set<string>();
  const unique = streams.filter(s => {
    if (!s.url) return true;
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
  return [...unique].sort((a, b) => getStreamScore(b) - getStreamScore(a));
}

function getStreamRecommendation(stream: StreamResult, bestScore: number) {
  const hints = stream.behaviorHints;
  const score = getStreamScore(stream);
  const profile = getServerProfile(stream);
  if (stream.isDownload) return { label: 'Descarga', color: Colors.textTertiary };
  if (hints && !hints.isDirect) return { label: 'Externo', color: Colors.warning };
  if (score === bestScore) return { label: 'Recomendado', color: Colors.success };
  if (profile && profile.color === Colors.success) return { label: profile.badge, color: profile.color };
  if (stream.url.includes('/api/proxy') || stream.url.includes('.m3u8')) return { label: 'Alta calidad', color: Colors.info };
  if (stream.type === 'direct') return { label: 'Directo', color: Colors.primaryLight };
  return { label: 'Fallback', color: Colors.textTertiary };
}

function getStreamCapabilityLabel(stream: StreamResult) {
  if (stream.isDownload) return 'Descarga';
  if (stream.behaviorHints && !stream.behaviorHints.isDirect) return 'Abre fuera del player';
  if (stream.url.includes('.m3u8')) return 'HLS, ideal para adelantar';
  if (stream.url.includes('/api/proxy')) return 'Directo con proxy';
  return stream.type === 'direct' ? 'Directo' : 'Alternativo';
}

export default function MediaDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mediaType = (type || 'movie') as MediaType;
  const mediaId = parseInt(id || '0', 10);
  const { width, height } = useWindowDimensions();
  
  // Smart UI/UX: Cinematic backdrop height calculation based on device/viewport
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  
  // On desktop, we use a wide, cinematic 21:9 or 16:9 like banner. 
  // On mobile, we use a taller ratio to cover more screen.
  const dynamicBackdropHeight = isDesktop
    ? Math.max(Math.min(height * 0.75, width / 2.35), 450) // Cinematic ultra-wide approx 2.35:1
    : isTablet
    ? Math.min(height * 0.6, 500)
    : Math.min(height * 0.55, 500);
  
  const [showRecommendModal, setShowRecommendModal] = useState(false);

  // Fetch media details
  const { data: details, isLoading } = useQuery({
    queryKey: queryKeys.details(mediaId, mediaType),
    queryFn: () => getDetails(mediaId, mediaType),
    enabled: mediaId > 0,
  });

  // State for TV Shows
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // Fetch season details if it's a TV show
  const { data: seasonDetails, isLoading: seasonLoading } = useQuery({
    queryKey: ['seasonDetails', mediaId, selectedSeason],
    queryFn: () => getSeasonDetails(mediaId, selectedSeason),
    enabled: mediaType === 'tv' && mediaId > 0 && selectedSeason > 0,
  });

  const { isInWatchlist, toggleWatchlist, loadWatchlist } = useWatchlistStore();
  const { setActiveStreams, setActiveSubtitles } = usePlayerStore();
  const isSaved = isInWatchlist(mediaId.toString());

  React.useEffect(() => {
    loadWatchlist();
  }, []);

  const { isLoading: providersLoading } = useProvidersStore();
  const [liveStreams, setLiveStreams] = useState<StreamResult[]>([]);
  const [activeTab, setActiveTab] = useState<'streaming' | 'downloads'>('streaming');

  // Fetch streams from providers progressively
  const streamQueryKey = mediaType === 'tv' 
    ? queryKeys.streams(`${id}:s${selectedSeason}e${selectedEpisode}`, mediaType)
    : queryKeys.streams(id || '', mediaType);

  const { data: cachedData, isLoading: streamsLoading } = useQuery({
    queryKey: streamQueryKey,
    queryFn: async () => {
      // Reset only if we don't have cached data yet
      setLiveStreams(prev => prev.length > 0 ? [] : []);
      
      // Call searchStreams with a progressive append callback
      const result = await providerManager.searchStreams(
        id || '', 
        mediaType,
        mediaType === 'tv' ? selectedSeason : undefined,
        mediaType === 'tv' ? selectedEpisode : undefined,
        (newStreams) => {
          setLiveStreams(prev => {
            // Deduplicate logic just in case an addon duplicates streams
            const existingUrls = new Set(prev.map(s => s.url));
            const distinctNew = newStreams.filter(s => !existingUrls.has(s.url));
            
            if (distinctNew.length === 0) return prev;
            
            const merged = [...prev, ...distinctNew];
            return sortStreamsForUser(merged);
          });
        }
      );
      
      return result;
    },
    enabled: !!id && !providersLoading,
    staleTime: 1000 * 60 * 30, // Cache streams for 30 minutes — tokens typically last 1-4 hrs so this is safe
  });

  // Hydrate liveStreams with cached data instantly when returning to the page
  React.useEffect(() => {
    if (cachedData?.streams && cachedData.streams.length > 0) {
      setLiveStreams(sortStreamsForUser(cachedData.streams));
    }
  }, [cachedData]);

  if (isLoading || !details) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const rating = getRatingStars(details.vote_average);
  const year = getReleaseYear(details);
  const trailer = details.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
  const runtime = details.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}min`
    : details.number_of_seasons
    ? `${details.number_of_seasons} temporada${details.number_of_seasons > 1 ? 's' : ''}`
    : '';

  const streamingLinks = liveStreams.filter(s => !s.isDownload);
  const downloadLinks = liveStreams.filter(s => s.isDownload);
  const currentStreams = activeTab === 'streaming' ? streamingLinks : downloadLinks;
  const bestCurrentScore = currentStreams.length > 0 ? Math.max(...currentStreams.map(getStreamScore)) : 0;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Smart Backdrop */}
        <View style={[styles.backdropContainer, { height: dynamicBackdropHeight, width: '100%' }]}>
        <Image
          source={{ uri: getBackdropUrl(details.backdrop_path) }}
          style={styles.backdrop}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={[
            'transparent',
            'rgba(10,10,15,0.4)',
            'rgba(10,10,15,0.9)',
            Colors.background,
          ]}
          locations={[0, 0.4, 0.85, 1]}
          style={styles.backdropGradient}
        />
        {/* Horizontal gradient for left-aligned content on desktop */}
        {isDesktop && (
          <LinearGradient
            colors={['rgba(10,10,15,0.95)', 'rgba(10,10,15,0.7)', 'transparent']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>

      {/* Info Section (max width constrained for readability) */}
      <View style={[
        styles.infoSection, 
        isDesktop && { 
          maxWidth: 800, 
          alignSelf: 'flex-start',
          marginLeft: '5%',
          marginTop: -dynamicBackdropHeight * 0.6,
          paddingRight: Spacing.xl,
          position: 'relative',
          zIndex: 10
        },
        !isDesktop && { maxWidth: 1200, alignSelf: 'center', width: '100%' }
      ]}>
        {/* Title */}
        <Text style={[styles.title, isDesktop && { fontSize: 48, lineHeight: 56 }]}>
          {getTitle(details)}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <Badge text={`★ ${rating.toFixed(1)}`} variant="rating" />
          {year && <Text style={styles.metaText}>{year}</Text>}
          {runtime && <Text style={styles.metaText}>{runtime}</Text>}
          {details.genres?.slice(0, 2).map((g) => (
            <Badge key={g.id} text={g.name} variant="language" />
          ))}
        </View>

        {/* Tagline */}
        {details.tagline ? (
          <Text style={styles.tagline}>"{details.tagline}"</Text>
        ) : null}

        {/* Overview */}
        <Text style={styles.overview}>{details.overview}</Text>

        {trailer && (
          <Button
            title="Ver Tráiler"
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`)}
            variant="secondary"
            icon={<Ionicons name="logo-youtube" size={20} color={Colors.textPrimary} />}
            style={{ marginBottom: Spacing.md }}
          />
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button
            title="Ver Ahora"
            onPress={() => {
              if (streamingLinks?.[0]) {
                setActiveStreams(streamingLinks);
                setActiveSubtitles(cachedData?.subtitles || []);
                router.push({
                  pathname: '/player',
                  params: {
                    url: streamingLinks[0].url,
                    title: mediaType === 'tv' 
                      ? `${getTitle(details)} - S${selectedSeason}E${selectedEpisode}` 
                      : getTitle(details),
                    tmdbId: details.id.toString(),
                    mediaType: mediaType,
                  },
                });
              }
            }}
            variant="primary"
            size="lg"
            disabled={streamingLinks.length === 0}
            icon={<Ionicons name="play" size={20} color={Colors.textPrimary} />}
            style={{ flex: 1 }}
          />
          <HapticPressable 
            style={[styles.iconButton, isSaved && { borderColor: Colors.primary, backgroundColor: 'rgba(229,9,20,0.1)' }]}
            onPress={() => toggleWatchlist(mediaId.toString(), mediaType)}
          >
            <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={24} color={isSaved ? Colors.primary : Colors.textPrimary} />
          </HapticPressable>
          <HapticPressable 
            style={styles.iconButton}
            onPress={() => setShowRecommendModal(true)}
          >
            <Ionicons name="heart-outline" size={24} color={Colors.textPrimary} />
          </HapticPressable>
        </View>
      </View>

      {/* Recommend Modal */}
      <RecommendModal
        visible={showRecommendModal}
        onClose={() => setShowRecommendModal(false)}
        tmdbId={details.id.toString()}
        mediaType={mediaType}
        mediaTitle={getTitle(details)}
      />

      {/* Cast */}
      {details.credits?.cast && details.credits.cast.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reparto</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.castRow}>
              {details.credits.cast.slice(0, 10).map((person) => (
                <HapticPressable 
                  key={person.id} 
                  style={styles.castItem}
                  onPress={() => router.push({ pathname: '/person/[id]', params: { id: person.id.toString() } })}
                >
                  <Image
                    source={{ uri: getImageUrl(person.profile_path, 'w185') }}
                    style={styles.castImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <Text style={styles.castName} numberOfLines={1}>
                    {person.name}
                  </Text>
                  <Text style={styles.castCharacter} numberOfLines={1}>
                    {person.character}
                  </Text>
                </HapticPressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* TV Show Seasons & Episodes */}
      {mediaType === 'tv' && details.number_of_seasons && details.number_of_seasons > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temporadas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {Array.from({ length: details.number_of_seasons }).map((_, i) => (
                <Pressable
                  key={`season-${i + 1}`}
                  style={[
                    styles.seasonTab,
                    selectedSeason === i + 1 && styles.seasonTabActive
                  ]}
                  onPress={() => {
                    setSelectedSeason(i + 1);
                    setSelectedEpisode(1);
                  }}
                >
                  <Text style={[
                    styles.seasonTabText,
                    selectedSeason === i + 1 && styles.seasonTabTextActive
                  ]}>
                    Temporada {i + 1}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {seasonLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
          ) : seasonDetails && seasonDetails.episodes && seasonDetails.episodes.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                {seasonDetails.episodes.map((ep) => (
                  <HapticPressable
                    key={ep.id}
                    style={[
                      styles.episodeCard,
                      selectedEpisode === ep.episode_number && styles.episodeCardActive
                    ]}
                    onPress={() => setSelectedEpisode(ep.episode_number)}
                  >
                    <Image
                      source={{ uri: getImageUrl(ep.still_path, 'w342') }}
                      style={styles.episodeImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.episodeInfo}>
                      <Text style={styles.episodeNumber}>E{ep.episode_number}</Text>
                      <Text style={styles.episodeTitle} numberOfLines={1}>{ep.name}</Text>
                    </View>
                  </HapticPressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={{ color: Colors.textTertiary, paddingHorizontal: Spacing.md }}>
              No hay episodios disponibles
            </Text>
          )}
        </View>
      )}

      {/* Streams / Sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Fuentes {mediaType === 'tv' ? `(T${selectedSeason} E${selectedEpisode})` : 'Disponibles'}
        </Text>
        {liveStreams.length > 0 && (
          <Text style={styles.sectionMeta}>
            {streamingLinks.length} streaming · {downloadLinks.length} descarga{downloadLinks.length === 1 ? '' : 's'}
          </Text>
        )}
        
        {liveStreams.length === 0 && streamsLoading ? (
          <View style={styles.streamsList}>
            <Text style={styles.searchingText}>Buscando servidores estables...</Text>
            {[0, 1, 2].map((item) => (
              <View key={`stream-skeleton-${item}`} style={styles.streamSkeleton}>
                <View style={styles.streamSkeletonIcon} />
                <View style={styles.streamSkeletonCopy}>
                  <View style={styles.streamSkeletonLineWide} />
                  <View style={styles.streamSkeletonLine} />
                </View>
              </View>
            ))}
          </View>
        ) : liveStreams.length > 0 ? (
          <View style={styles.streamsList}>
            <View style={styles.tabContainer}>
              <HapticPressable 
                onPress={() => setActiveTab('streaming')}
                style={[styles.tab, activeTab === 'streaming' && styles.activeTab]}
              >
                <Text style={[styles.tabText, activeTab === 'streaming' && styles.activeTabText]}>
                  Streaming ({streamingLinks.length})
                </Text>
              </HapticPressable>
              
              <HapticPressable 
                onPress={() => setActiveTab('downloads')}
                disabled={downloadLinks.length === 0}
                style={[
                  styles.tab,
                  activeTab === 'downloads' && styles.activeTab,
                  downloadLinks.length === 0 && styles.tabDisabled,
                ]}
              >
                <Text style={[styles.tabText, activeTab === 'downloads' && styles.activeTabText]}>
                  Descargas ({downloadLinks.length})
                </Text>
              </HapticPressable>
            </View>

            {currentStreams.map((stream, index) => {
              const handleDownload = () => {
                const titleStr = mediaType === 'tv' 
                  ? `${getTitle(details)} - S${selectedSeason}E${selectedEpisode}` 
                  : getTitle(details);
                
                // Create a unique ID for this download (mediaId + season/ep + provider + quality)
                const downloadId = `${details.id}_${mediaType}_${selectedSeason || 0}_${selectedEpisode || 0}_${stream.provider}_${stream.quality}`.replace(/[^a-zA-Z0-9]/g, '_');
                
                // Add to store
                useDownloadStore.getState().addDownload({
                  id: downloadId,
                  mediaId: details.id.toString(),
                  type: mediaType,
                  title: titleStr,
                  posterPath: details.poster_path,
                  serverName: stream.provider,
                  url: stream.url,
                });
                
                // Start download
                downloadManager.startDownload(downloadId);
                
                if (Platform.OS === 'web') {
                  // Fallback for web is handled inside downloadManager
                } else {
                  // Show feedback maybe
                  alert('Descarga iniciada. Revisa la sección de descargas.');
                }
              };

              return (
              <StreamItem
                key={index}
                stream={stream}
                bestScore={bestCurrentScore}
                onDownload={handleDownload}
                onPress={() => {
                  if (stream.isDownload) {
                    Platform.OS === 'web' ? window.open(stream.url, '_blank') : Linking.openURL(stream.url);
                  } else if (stream.behaviorHints && !stream.behaviorHints.isDirect) {
                    // Indirect embed link (e.g. Voe) -> Open external browser/tab
                    Platform.OS === 'web' ? window.open(stream.url, '_blank') : Linking.openURL(stream.url);
                  } else {
                    // Put the selected stream first, then the rest
                    const reorderedStreams = [
                      stream,
                      ...streamingLinks.filter(s => s.url !== stream.url)
                    ];
                    setActiveStreams(reorderedStreams);
                    setActiveSubtitles(cachedData?.subtitles || []);
                    
                    router.push({
                      pathname: '/player',
                      params: { 
                        url: stream.url, 
                        title: mediaType === 'tv' 
                          ? `${getTitle(details)} - S${selectedSeason}E${selectedEpisode}` 
                          : getTitle(details),
                        tmdbId: details.id.toString(),
                        mediaType: mediaType,
                      },
                    });
                  }
                }}
              />
            )})}

            {currentStreams.length === 0 && !streamsLoading && (
              <View style={styles.emptyTab}>
                <Ionicons 
                  name={activeTab === 'streaming' ? 'play-circle-outline' : 'download-outline'} 
                  size={48} 
                  color={Colors.textTertiary} 
                />
                <Text style={styles.emptyTabText}>
                  No hay {activeTab === 'streaming' ? 'streaming' : 'links de descarga'} disponibles aún.
                </Text>
              </View>
            )}
            
            {/* Show spinner below the list if still searching for more streams */}
            {streamsLoading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, gap: Spacing.sm }}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.searchingText}>Buscando más fuentes...</Text>
              </View>
            )}
            
            {/* VIP Cache Request Button */}
            {!streamsLoading && (
              <HapticPressable 
                onPress={async () => {
                  try {
                    await ensureSupabaseSession();

                    const { error } = await supabase.from('vip_requests').insert({
                      tmdb_id: details.id.toString(),
                      media_type: mediaType,
                      title: getTitle(details),
                      provider: 'auto',
                      source_url: 'search',
                      status: 'pending'
                    });
                    
                    if (error) throw error;
                    alert('¡Petición VIP enviada! La Seedbox buscará y descargará esta película en alta calidad en breve.');
                  } catch (e: any) {
                    alert('Error enviando petición VIP: ' + e.message);
                  }
                }}
                style={styles.betterSourceButton}
              >
                <Ionicons name="server" size={20} color={Colors.primaryLight} />
                <View style={styles.betterSourceCopy}>
                  <Text style={styles.betterSourceTitle}>Pedir mejor fuente</Text>
                  <Text style={styles.betterSourceText}>Buscamos una version mas estable o de mayor calidad.</Text>
                </View>
              </HapticPressable>
            )}
          </View>
        ) : (
          <View style={styles.noStreams}>
            <Ionicons name="cloud-offline-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.noStreamsText}>
              No hay fuentes disponibles. Agrega un proveedor en Perfil → Proveedores.
            </Text>
            
            {/* VIP Cache Request Button (When no streams at all) */}
            <HapticPressable 
                onPress={async () => {
                  try {
                    await ensureSupabaseSession();

                    const { error } = await supabase.from('vip_requests').insert({
                      tmdb_id: details.id.toString(),
                      media_type: mediaType,
                      title: getTitle(details),
                      provider: 'auto',
                      source_url: 'search',
                      status: 'pending'
                    });
                    
                    if (error) throw error;
                    alert('¡Petición VIP enviada! La Seedbox buscará y descargará esta película en alta calidad en breve.');
                  } catch (e: any) {
                    alert('Error enviando petición VIP: ' + e.message);
                  }
                }}
                style={styles.betterSourceButton}
              >
                <Ionicons name="server" size={20} color={Colors.primaryLight} />
                <View style={styles.betterSourceCopy}>
                  <Text style={styles.betterSourceTitle}>Pedir mejor fuente</Text>
                  <Text style={styles.betterSourceText}>Buscamos una version estable para este titulo.</Text>
                </View>
            </HapticPressable>
          </View>
        )}
      </View>

      {/* Similar Content */}
      {details.similar?.results && details.similar.results.length > 0 && (
        <View style={{ marginTop: Spacing.xl }}>
          <MediaRow
            title="Similares a este título"
            data={details.similar.results}
          />
        </View>
      )}
    </ScrollView>

    {/* Floating Back Button */}
    <HapticPressable
      onPress={() => router.back()}
      style={[
        styles.backButton, 
        { top: insets.top + Spacing.sm, position: Platform.OS === 'web' ? 'fixed' : 'absolute' } as any
      ]}
    >
      <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
    </HapticPressable>
  </View>
  );
}

/** Individual stream source item */
function StreamItem({ stream, bestScore, onPress, onDownload }: { stream: StreamResult; bestScore: number; onPress: () => void; onDownload?: () => void }) {
  const qualityColor: Record<string, string> = {
    '4K': '#FFD700',
    '1080p': '#4FC3F7',
    '720p': '#81C784',
    '480p': Colors.textTertiary,
    Unknown: Colors.textTertiary,
  };

  const isIndirect = stream.behaviorHints && !stream.behaviorHints.isDirect;
  const canDownload = !isIndirect && !stream.isDownload && onDownload;
  const recommendation = getStreamRecommendation(stream, bestScore);
  const serverProfile = getServerProfile(stream);
  const isPreferred = !isIndirect && !stream.isDownload && serverProfile?.color === Colors.success;
  const serverName = serverProfile?.label || stream.provider;
  const serverMeta = [
    stream.quality,
    stream.language,
    stream.size,
    stream.url.includes('/api/proxy') ? 'Proxy' : null,
    stream.url.includes('.m3u8') ? 'HLS' : null,
  ].filter(Boolean).join(' · ');

  const capability = getStreamCapabilityLabel(stream);

  return (
    <View style={[
      styles.streamItem,
      isPreferred && styles.streamItemPreferred,
      recommendation.label === 'Recomendado' && styles.streamItemRecommended,
      isIndirect && { opacity: 0.75 },
    ]}>
      <HapticPressable onPress={onPress} style={styles.streamPressable}>
        <View style={[
          styles.streamIcon,
          isPreferred && { backgroundColor: 'rgba(0, 200, 83, 0.14)' },
          isIndirect && { backgroundColor: Colors.surfaceLight },
        ]}>
          <Ionicons
            name={isIndirect ? 'open-outline' : stream.isDownload ? 'download-outline' : serverProfile?.icon || (stream.type === 'torrent' ? 'magnet-outline' : 'play-circle-outline')}
            size={24}
            color={isIndirect ? Colors.textTertiary : serverProfile?.color || Colors.primary}
          />
        </View>
        <View style={styles.streamInfo}>
          <Text style={[styles.streamTitle, isIndirect && { color: Colors.textSecondary }]} numberOfLines={2}>
            {serverName}{isIndirect ? ' (Externo)' : ''}
          </Text>
          <Text style={styles.streamMeta} numberOfLines={2}>
            {stream.provider} {stream.size ? `· ${stream.size}` : ''}
          </Text>
          <Text style={styles.streamCapability} numberOfLines={1}>
            {capability}
          </Text>
        </View>
        <View style={styles.streamBadges}>
          <Badge
            text={recommendation.label}
            color={recommendation.color}
          />
          <Badge
            text={stream.quality}
            color={isIndirect ? Colors.textTertiary : qualityColor[stream.quality]}
          />
        </View>
      </HapticPressable>
      
      {canDownload && (
        <HapticPressable onPress={onDownload} style={{ padding: Spacing.sm, marginLeft: Spacing.sm }}>
          <Ionicons name="cloud-download-outline" size={24} color={Colors.primary} />
        </HapticPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  backdropContainer: {
    width: '100%',
    // Height set dynamically via inline styles for responsive layout
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  tagline: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  overview: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionMeta: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  castRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  castItem: {
    alignItems: 'center',
    width: 100,
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  castName: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  castCharacter: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  streamsList: {
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabDisabled: {
    opacity: 0.45,
  },
  tabText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.textPrimary,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyTabText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  streamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 0,
  },
  streamItemRecommended: {
    borderColor: 'rgba(0, 200, 83, 0.45)',
    backgroundColor: 'rgba(0, 200, 83, 0.08)',
  },
  streamItemPreferred: {
    borderColor: 'rgba(0, 200, 83, 0.28)',
    backgroundColor: 'rgba(0, 200, 83, 0.05)',
  },
  streamPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  streamIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamInfo: {
    flex: 1,
    minWidth: 0,
  },
  streamTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  streamMeta: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  streamCapability: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  streamBadges: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
    flexShrink: 0,
  },
  noStreams: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  noStreamsText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  searchingText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  streamSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streamSkeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
  },
  streamSkeletonCopy: {
    flex: 1,
    gap: Spacing.sm,
  },
  streamSkeletonLineWide: {
    width: '70%',
    height: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  streamSkeletonLine: {
    width: '45%',
    height: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  betterSourceButton: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 71, 0.28)',
    backgroundColor: 'rgba(255, 61, 71, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  betterSourceCopy: {
    flex: 1,
    minWidth: 0,
  },
  betterSourceTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  betterSourceText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  seasonTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  seasonTabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderColor: Colors.primary,
  },
  seasonTabText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  seasonTabTextActive: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  episodeCard: {
    width: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  episodeCardActive: {
    borderColor: Colors.primary,
  },
  episodeImage: {
    width: '100%',
    height: 90,
    backgroundColor: Colors.surfaceLight,
  },
  episodeInfo: {
    padding: Spacing.sm,
  },
  episodeNumber: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  episodeTitle: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
});
