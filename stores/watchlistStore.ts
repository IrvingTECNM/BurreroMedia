import { create } from 'zustand';
import { ensureSupabaseSession, supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

export type WatchlistStatus = 'want_to_watch' | 'watching' | 'watched';

export interface WatchlistItem {
  id: string;
  user_id: string;
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  status: WatchlistStatus;
  added_at: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  loadWatchlist: () => Promise<void>;
  toggleWatchlist: (tmdbId: string, mediaType: 'movie' | 'tv', status?: WatchlistStatus) => Promise<boolean>;
  updateStatus: (tmdbId: string, status: WatchlistStatus) => Promise<boolean>;
  isInWatchlist: (tmdbId: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  isLoading: false,

  loadWatchlist: async () => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    set({ isLoading: true });
    try {
      await ensureSupabaseSession();

      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      set({ items: data || [], isLoading: false });
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      set({ isLoading: false });
    }
  },

  toggleWatchlist: async (tmdbId, mediaType, status = 'want_to_watch') => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    const existing = get().items.find(i => i.tmdb_id === tmdbId);

    try {
      await ensureSupabaseSession();

      if (existing) {
        // Remove
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', userId)
          .eq('tmdb_id', tmdbId);
        
        if (error) throw error;
        set(state => ({ items: state.items.filter(i => i.tmdb_id !== tmdbId) }));
        return false; // Returns false indicating it was removed
      } else {
        // Add
        const newItem = {
          user_id: userId,
          tmdb_id: tmdbId,
          media_type: mediaType,
          status,
        };
        const { data, error } = await supabase
          .from('watchlist')
          .insert(newItem)
          .select()
          .single();

        if (error) throw error;
        set(state => ({ items: [data, ...state.items] }));
        return true; // Returns true indicating it was added
      }
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
      return existing ? true : false;
    }
  },

  updateStatus: async (tmdbId, status) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    try {
      await ensureSupabaseSession();

      const { error } = await supabase
        .from('watchlist')
        .update({ status })
        .eq('user_id', userId)
        .eq('tmdb_id', tmdbId);

      if (error) throw error;
      set(state => ({
        items: state.items.map(i => i.tmdb_id === tmdbId ? { ...i, status } : i)
      }));
      return true;
    } catch (err) {
      console.error('Failed to update watchlist status:', err);
      return false;
    }
  },

  isInWatchlist: (tmdbId) => {
    return get().items.some(i => i.tmdb_id === tmdbId);
  }
}));
