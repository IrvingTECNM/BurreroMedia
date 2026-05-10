/**
 * Home Screen — Main Catalog
 *
 * Netflix-style home with hero banner and horizontally
 * scrollable rows of trending, popular, and top-rated content.
 * Powered by TanStack Query for caching and stale-while-revalidate.
 */
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, RefreshControl, View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { HeroBanner } from '@/components/HeroBanner';
import { MediaRow } from '@/components/MediaRow';
import { queryKeys } from '@/lib/query-client';
import { getTrending, getPopular, getTopRated, getNowPlaying, getDetails, getRecommendations, getDiscover } from '@/lib/tmdb';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { usePlayerStore } from '@/stores/playerStore';
import { Button } from '@/components/ui/Button';

export default function HomeScreen() {
  const { progressHistory, loadProgressHistory } = usePlayerStore();
  
  useEffect(() => {
    loadProgressHistory();
  }, []);

  // Fetch Recommended items based on history
  const recentTmdbIds = useMemo(
    () => (progressHistory || []).slice(0, 3).map(p => p?.tmdb_id),
    [progressHistory]
  );

  const recommendedItems = useQuery({
    queryKey: ['personalizedRecommendations', recentTmdbIds],
    queryFn: async () => {
      if (progressHistory.length > 0) {
        const recent = progressHistory.slice(0, 3);
        const allRecs = await Promise.all(
          recent.map(p => getRecommendations(parseInt(p.tmdb_id, 10), p.media_type))
        );
        const flattened = allRecs.flat();
        const unique = flattened.filter((item, index, self) => 
          index === self.findIndex((t) => t.id === item.id)
        );
        return unique.slice(0, 20);
      } else {
        return getDiscover('movie');
      }
    },
  });

  // Fetch all data in parallel via TanStack Query
  const trending = useQuery({
    queryKey: queryKeys.trending('movie', 'week'),
    queryFn: () => getTrending('movie', 'week'),
  });

  const trendingTV = useQuery({
    queryKey: queryKeys.trending('tv', 'week'),
    queryFn: () => getTrending('tv', 'week'),
  });

  const popularMovies = useQuery({
    queryKey: queryKeys.popular('movie'),
    queryFn: () => getPopular('movie'),
  });

  const topRated = useQuery({
    queryKey: queryKeys.topRated('movie'),
    queryFn: () => getTopRated('movie'),
  });

  const nowPlaying = useQuery({
    queryKey: queryKeys.nowPlaying(),
    queryFn: () => getNowPlaying(),
  });

  // Fetch details for continue watching items (limited to 5)
  const continueWatchingIds = useMemo(
    () => (progressHistory || []).slice(0, 5).map(p => p?.tmdb_id),
    [progressHistory]
  );

  const continueWatchingItems = useQuery({
    queryKey: ['continueWatchingItems', continueWatchingIds],
    queryFn: async () => {
      const items = await Promise.all(
        progressHistory.slice(0, 5).map((p) => getDetails(parseInt(p.tmdb_id, 10), p.media_type))
      );
      return items;
    },
    enabled: progressHistory.length > 0,
  });

  const isRefreshing =
    trending.isRefetching ||
    trendingTV.isRefetching ||
    popularMovies.isRefetching;

  const handleRefresh = () => {
    trending.refetch();
    trendingTV.refetch();
    popularMovies.refetch();
    topRated.refetch();
    nowPlaying.refetch();
    loadProgressHistory();
  };

  // Memoize progress mapping
  const progressMap = useMemo(() => {
    return (progressHistory || []).reduce((acc, p) => ({
      ...acc,
      [p.tmdb_id]: p.duration > 0 ? p.position_seconds / p.duration : 0
    }), {} as Record<string, number>);
  }, [progressHistory]);

  const isError = trending.isError || popularMovies.isError || nowPlaying.isError;

  if (isError && !trending.data) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="cloud-offline-outline" size={64} color={Colors.textTertiary} />
        <Text style={{ color: Colors.textPrimary, ...Typography.h3, marginTop: 16, textAlign: 'center' }}>
          Error al cargar la cartelera
        </Text>
        <Text style={{ color: Colors.textTertiary, textAlign: 'center', marginTop: 8 }}>
          No pudimos conectar con los servidores de video. Revisa tu conexión.
        </Text>
        <Button 
          title="Reintentar" 
          onPress={() => {
            trending.refetch();
            popularMovies.refetch();
            nowPlaying.refetch();
          }}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Hero Banner */}
      <HeroBanner item={trending.data?.[0] || null} isLoading={trending.isLoading} />

      {/* Continue Watching */}
      {continueWatchingItems.data && continueWatchingItems.data.length > 0 && (
        <View style={styles.continueWatchingContainer}>
            <MediaRow
              title="Continuar Viendo"
              icon={<Ionicons name="time" size={20} color={Colors.primary} />}
              data={continueWatchingItems.data}
              isLoading={continueWatchingItems.isLoading}
              progressMap={progressMap}
            />
        </View>
      )}

      {/* Personalized Recommendations */}
      {recommendedItems.data && recommendedItems.data.length > 0 && (
        <MediaRow
          title="Recomendados para ti"
          icon={<Ionicons name="sparkles" size={20} color={Colors.accent} />}
          data={recommendedItems.data}
          isLoading={recommendedItems.isLoading}
        />
      )}

      {/* Trending Movies */}
      <MediaRow
        title="Tendencias de la Semana"
        icon={<Ionicons name="flame" size={20} color={Colors.primary} />}
        data={trending.data?.slice(1) || []}
        isLoading={trending.isLoading}
      />

      {/* Now Playing */}
      <MediaRow
        title="En Cines Ahora"
        icon={<Ionicons name="film" size={20} color={Colors.info} />}
        data={nowPlaying.data || []}
        isLoading={nowPlaying.isLoading}
      />

      {/* Trending Series */}
      <MediaRow
        title="Series en Tendencia"
        icon={<Ionicons name="tv" size={20} color={Colors.watching} />}
        data={trendingTV.data || []}
        isLoading={trendingTV.isLoading}
      />

      {/* Popular Movies */}
      <MediaRow
        title="Películas Populares"
        icon={<Ionicons name="star" size={20} color={Colors.accent} />}
        data={popularMovies.data || []}
        isLoading={popularMovies.isLoading}
      />

      {/* Top Rated */}
      <MediaRow
        title="Mejor Valoradas"
        icon={<Ionicons name="trophy" size={20} color={Colors.success} />}
        data={topRated.data || []}
        isLoading={topRated.isLoading}
      />
    </ScrollView>
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
  continueWatchingContainer: {
    marginTop: Spacing.md,
  }
});
