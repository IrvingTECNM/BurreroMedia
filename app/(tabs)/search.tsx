/**
 * Search Screen — Movie/Series Search
 *
 * Full-text search with debounce, genre filters,
 * and grid results powered by TMDB.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Keyboard,
  ScrollView,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaCard } from '@/components/MediaCard';
import { SkeletonMediaCard } from '@/components/ui/SkeletonMediaCard';
import { queryKeys } from '@/lib/query-client';
import { search, getTrending, getGenres, getDiscover } from '@/lib/tmdb';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 400);
  }, []);

  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  // Search results
  const searchResults = useQuery({
    queryKey: queryKeys.search(debouncedQuery),
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  // Genres
  const genres = useQuery({
    queryKey: ['genres', 'movie'],
    queryFn: () => getGenres('movie'),
  });

  // Discover by genre
  const discover = useQuery({
    queryKey: ['discover', 'movie', selectedGenre],
    queryFn: () => getDiscover('movie', selectedGenre ? [selectedGenre] : []),
    enabled: selectedGenre !== null && debouncedQuery.length < 2,
  });

  // Default: trending when no search
  const trending = useQuery({
    queryKey: queryKeys.trending('movie', 'day'),
    queryFn: () => getTrending('movie', 'day'),
    enabled: debouncedQuery.length < 2 && selectedGenre === null,
  });

  const data = debouncedQuery.length >= 2 
    ? searchResults.data 
    : selectedGenre !== null 
    ? discover.data 
    : trending.data;
    
  const isLoading = debouncedQuery.length >= 2 
    ? searchResults.isLoading 
    : selectedGenre !== null 
    ? discover.isLoading 
    : trending.isLoading;
  
  const isDesktop = Platform.OS === 'web' && width > 768;
  const contentMaxWidth = isDesktop ? 1200 : '100%';
  const alignSelf = isDesktop ? 'center' : 'auto';
  const resultCount = data?.length || 0;

  // Build all genre items (including "Todas")
  const allGenres = genres.data 
    ? [{ id: null as number | null, name: 'Todas' }, ...genres.data.map(g => ({ id: g.id as number | null, name: g.name }))]
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + (isDesktop ? 80 : 0) }]}>
      <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: alignSelf as any, flex: 1 }}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Buscar películas, series..."
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={handleSearch}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.textTertiary}
                onPress={() => {
                  setQuery('');
                  setDebouncedQuery('');
                }}
                style={{ cursor: Platform.OS === 'web' ? 'pointer' : 'default' } as any}
              />
            )}
          </View>
        </View>

        {/* Genre Chips — horizontally scrollable */}
        {debouncedQuery.length < 2 && allGenres.length > 0 && (
          <View style={styles.genreTrack}>
            {allGenres.map((genre) => {
              const isActive = selectedGenre === genre.id;
              return (
                <Pressable
                  key={genre.id ?? 'all'}
                  style={[
                    styles.genreChip,
                    isActive && styles.genreChipActive,
                  ]}
                  onPress={() => setSelectedGenre(genre.id)}
                >
                  <Text style={[styles.genreChipText, isActive && styles.genreChipTextActive]}>
                    {genre.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {debouncedQuery.length >= 2
              ? `Resultados para "${debouncedQuery}"`
              : selectedGenre !== null
              ? 'Explorar Género'
              : 'Tendencias del Día'}
          </Text>
          {!isLoading && resultCount > 0 && (
            <Text style={styles.resultCount}>{resultCount} títulos</Text>
          )}
        </View>

        {/* Results Grid */}
        {isLoading ? (
          <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false} scrollEnabled={false}>
            <View style={styles.gridRow}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={`skeleton-${i}`} style={styles.gridItem}>
                  <SkeletonMediaCard size="lg" />
                </View>
              ))}
            </View>
          </ScrollView>
        ) : data && data.length > 0 ? (
          <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
            <View style={styles.gridRow}>
              {data.map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <MediaCard item={item} size="lg" />
                </View>
              ))}
            </View>
          </ScrollView>
        ) : debouncedQuery.length >= 2 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptySubtitle}>
              Intenta con otro nombre o busca por género
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  // ─── Genre chips ──────────────────────────────────────────
  genreTrack: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    ...Platform.select({
      web: {
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      } as any,
      default: {},
    }),
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease',
      } as any,
      default: {},
    }),
  },
  genreChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  genreChipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  genreChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // ─── Sections ─────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    flex: 1,
  },
  resultCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  // ─── Grid ─────────────────────────────────────────────────
  gridContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.xl,
  },
  gridItem: {
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
