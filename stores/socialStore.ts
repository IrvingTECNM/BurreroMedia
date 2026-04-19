/**
 * Social Store — Zustand
 *
 * Manages the social feed: recommendations, activity, and real-time updates.
 */
import { create } from 'zustand';
import { supabase, Recommendation, Profile } from '@/lib/supabase';

export interface FeedItem {
  id: string;
  type: 'recommendation' | 'watchlist_add' | 'rating';
  user: Profile;
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  message?: string;
  rating?: number;
  status?: string;
  created_at: string;
}

interface SocialState {
  feed: FeedItem[];
  myRecommendations: Recommendation[];
  isLoading: boolean;

  // Actions
  loadFeed: () => Promise<void>;
  sendRecommendation: (data: {
    fromUserId: string;
    toUserId: string | null;
    tmdbId: string;
    mediaType: 'movie' | 'tv';
    message?: string;
  }) => Promise<boolean>;
  loadMyRecommendations: (userId: string) => Promise<void>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

export const useSocialStore = create<SocialState>((set) => ({
  feed: [],
  myRecommendations: [],
  isLoading: false,

  loadFeed: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          *,
          from_profile:profiles!from_user(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const feedItems: FeedItem[] = (data || []).map((rec: any) => ({
        id: rec.id,
        type: 'recommendation' as const,
        user: rec.from_profile,
        tmdb_id: rec.tmdb_id,
        media_type: rec.media_type,
        message: rec.message,
        created_at: rec.created_at,
      }));

      set({ feed: feedItems, isLoading: false });
    } catch (err) {
      console.error('Failed to load feed:', err);
      set({ isLoading: false });
    }
  },

  sendRecommendation: async ({ fromUserId, toUserId, tmdbId, mediaType, message }) => {
    try {
      const { error } = await supabase.from('recommendations').insert({
        from_user: fromUserId,
        to_user: toUserId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        message: message || null,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to send recommendation:', err);
      return false;
    }
  },

  loadMyRecommendations: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('from_user', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ myRecommendations: data || [] });
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
  },

  subscribeToRealtime: () => {
    const subscription = supabase
      .channel('public:recommendations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'recommendations' },
        (payload) => {
          console.log('New recommendation arrived:', payload);
          // Simply reload the feed to get the joined profile data
          // In a more optimized version, we could fetch just the new profile 
          // and prepend it to the state.
          useSocialStore.getState().loadFeed();
        }
      )
      .subscribe();
      
    // Store it or just let it live (Zustand stores are singletons)
    // We could attach it to the state if we want to explicitly unsubscribe later
  },

  unsubscribeFromRealtime: () => {
    supabase.removeAllChannels();
  }
}));

export default useSocialStore;
