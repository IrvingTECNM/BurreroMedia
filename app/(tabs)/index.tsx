/**
 * Home Screen — Main Catalog
 *
 * Netflix-style home with hero banner and horizontally
 * scrollable rows of trending, popular, and top-rated content.
 * Powered by TanStack Query for caching and stale-while-revalidate.
 */
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, RefreshControl, View, Text, useWindowDimensions, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { HeroBanner } from '@/components/HeroBanner';
import { MediaRow } from '@/components/MediaRow';
import { queryKeys } from '@/lib/query-client';
import { getTrending, getPopular, getTopRated, getNowPlaying, getDetails } from '@/lib/tmdb';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { usePlayerStore } from '@/stores/playerStore';

export default function HomeScreen() {
  const { progressHistory, loadProgressHistory } = usePlayerStore();
  const { width } = useWindowDimensions();
  
  // Removed artificial max width so the app spans edge-to-edge gracefully
  // like a true premium streaming application.

  useEffect(() => {
    loadProgressHistory();
  }, [loadProgressHistory]);

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

  // Fetch details for continue watching items (limited to 5 for now)
  const continueWatchingItems = useQuery({
    queryKey: ['continueWatchingItems', progressHistory.map((p) => p.tmdb_id)],
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

  // Hero: first trending movie
  const heroItem = trending.data?.[0] || null;

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
      <HeroBanner item={heroItem} isLoading={trending.isLoading} />

      {/* Continue Watching */}
      {continueWatchingItems.data && continueWatchingItems.data.length > 0 && (
        <View style={styles.continueWatchingContainer}>
            <MediaRow
              title="Continuar Viendo"
              icon={<Ionicons name="time" size={20} color={Colors.primary} />}
              data={continueWatchingItems.data}
              isLoading={continueWatchingItems.isLoading}
            />
        </View>
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
    paddingBottom: 100, // Extra space for tab bar
  },
  continueWatchingContainer: {
    marginTop: Spacing.md,
  }
});
