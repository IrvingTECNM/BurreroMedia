/**
 * TanStack Query Client Configuration
 *
 * Provides global cache, retry logic, and stale-while-revalidate
 * for all TMDB and provider API calls.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering stale
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 2 hours (allows stream reuse across profiles)
      gcTime: 2 * 60 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus for mobile (avoids unnecessary API calls)
      refetchOnWindowFocus: false,
      // Prevent queries from pausing indefinitely if the browser falsely reports offline
      networkMode: 'always',
    },
  },
});

// --- Query Keys Factory ---
// Centralized query keys for consistent cache invalidation

export const queryKeys = {
  // TMDB Queries
  trending: (mediaType: string, timeWindow: string) =>
    ['tmdb', 'trending', mediaType, timeWindow] as const,
  popular: (mediaType: string) =>
    ['tmdb', 'popular', mediaType] as const,
  topRated: (mediaType: string) =>
    ['tmdb', 'topRated', mediaType] as const,
  nowPlaying: () =>
    ['tmdb', 'nowPlaying'] as const,
  details: (id: number, mediaType: string) =>
    ['tmdb', 'details', id, mediaType] as const,
  search: (query: string) =>
    ['tmdb', 'search', query] as const,
  genres: (mediaType: string) =>
    ['tmdb', 'genres', mediaType] as const,

  // Watchlist Queries
  watchlist: (userId: string) =>
    ['watchlist', userId] as const,
  watchlistByStatus: (userId: string, status: string) =>
    ['watchlist', userId, status] as const,

  // Social Queries
  recommendations: (userId: string) =>
    ['recommendations', userId] as const,
  feed: () =>
    ['feed'] as const,

  // Providers
  streams: (tmdbId: string, mediaType: string) =>
    ['streams', tmdbId, mediaType] as const,

  // Continue Watching
  continueWatching: (userId: string) =>
    ['continueWatching', userId] as const,
} as const;

export default queryClient;
