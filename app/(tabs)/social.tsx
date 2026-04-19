/**
 * Social Screen — Friend Activity Feed
 *
 * Displays recommendations, ratings, and watchlist activity
 * from friends in a chronological feed.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useSocialStore, FeedItem } from '@/stores/socialStore';
import { getDetails } from '@/lib/tmdb';
import { HapticPressable } from '@/components/ui/HapticPressable';

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { feed, isLoading, loadFeed, subscribeToRealtime, unsubscribeFromRealtime } = useSocialStore();
  const router = useRouter();

  useEffect(() => {
    loadFeed();
    subscribeToRealtime();
    return () => {
      unsubscribeFromRealtime();
    };
  }, [loadFeed, subscribeToRealtime, unsubscribeFromRealtime]);

  const renderItem = ({ item }: { item: FeedItem }) => {
    return <FeedCard item={item} onPress={() => {
      router.push({
        pathname: '/media/[id]',
        params: { id: item.tmdb_id, type: item.media_type },
      });
    }} />;
  };

  const contentMaxWidth = Platform.OS === 'web' && width > 1000 ? 1000 : '100%';
  const alignSelf = Platform.OS === 'web' && width > 1000 ? 'center' : 'auto';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: alignSelf as any, flex: 1 }}>
      {/* Header */}
      <Text style={styles.headerTitle}>Social</Text>
      <Text style={styles.headerSubtitle}>
        Descubre lo que están viendo tus amigos
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={64} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Sin actividad aún</Text>
          <Text style={styles.emptySubtitle}>
            Cuando tus amigos recomienden películas o series, aparecerán aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedList}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          refreshing={isLoading}
          onRefresh={loadFeed}
        />
      )}
      </View>
    </View>
  );
}

function FeedCard({ item, onPress }: { item: FeedItem; onPress: () => void }) {
  const { data: mediaDetails, isLoading } = useQuery({
    queryKey: ['mediaDetails', item.tmdb_id, item.media_type],
    queryFn: () => getDetails(parseInt(item.tmdb_id), item.media_type),
  });

  return (
    <HapticPressable style={styles.feedCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: item.user?.avatar_color || Colors.surfaceLight }]}>
          <Text style={styles.avatarLetter}>
            {item.user?.display_name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.userName}>{item.user?.display_name || 'Alguien'}</Text>
          <Text style={styles.actionText}>recomendó una {item.media_type === 'tv' ? 'serie' : 'película'}</Text>
        </View>
      </View>

      {item.message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>"{item.message}"</Text>
        </View>
      )}

      {isLoading || !mediaDetails ? (
        <View style={styles.mediaSkeleton} />
      ) : (
        <View style={styles.mediaPreview}>
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w342${mediaDetails.backdrop_path || mediaDetails.poster_path}` }}
            style={styles.mediaImage}
            contentFit="cover"
          />
          <View style={styles.mediaInfo}>
            <Text style={styles.mediaTitle} numberOfLines={1}>
              {mediaDetails.title || mediaDetails.name}
            </Text>
            <Text style={styles.mediaYear}>
              {(mediaDetails.release_date || mediaDetails.first_air_date)?.split('-')[0]}
            </Text>
          </View>
        </View>
      )}
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
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
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  feedList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  feedCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarLetter: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  headerText: {
    flex: 1,
  },
  userName: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  actionText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  messageContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  messageText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontStyle: 'italic',
  },
  mediaSkeleton: {
    height: 200,
    backgroundColor: Colors.surfaceLight,
  },
  mediaPreview: {
    position: 'relative',
    height: 200,
  },
  mediaImage: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Spacing.md,
  },
  mediaTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  mediaYear: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
