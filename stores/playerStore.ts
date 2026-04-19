/**
 * Player Store — Zustand
 *
 * Manages video playback progress and syncs with Supabase.
 */
import { create } from 'zustand';
import { supabase, WatchingProgress } from '@/lib/supabase';
import { useAuthStore } from './authStore';

interface PlayerState {
  progressHistory: WatchingProgress[];
  
  // Actions
  loadProgressHistory: () => Promise<void>;
  updateProgress: (data: {
    tmdbId: string;
    mediaType: 'movie' | 'tv';
    currentTime: number;
    duration: number;
    season?: number;
    episode?: number;
  }) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  progressHistory: [],

  loadProgressHistory: async () => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('watching_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ progressHistory: data || [] });
    } catch (err) {
      console.error('Failed to load progress history:', err);
    }
  },

  updateProgress: async (data) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    // Only save if watched more than 5% and less than 95% 
    // to avoid cluttering "Continue watching" with finished or just-opened stuff
    const progressPercent = data.duration > 0 ? (data.currentTime / data.duration) : 0;
    
    // If finished, maybe we should still save it but mark it 'watched' in watchlist, 
    // but for now let's just save the progress.

    const newEntry = {
      user_id: userId,
      tmdb_id: data.tmdbId,
      media_type: data.mediaType,
      position_seconds: Math.floor(data.currentTime),
      duration: Math.floor(data.duration),
      season: data.season,
      episode: data.episode,
      updated_at: new Date().toISOString(),
    };

    try {
      // Upsert progress
      const { error } = await supabase
        .from('watching_progress')
        .upsert(newEntry, { onConflict: 'user_id, tmdb_id' });

      if (error) throw error;

      // Update local state by merging
      set((state) => {
        const existingIndex = state.progressHistory.findIndex(p => p.tmdb_id === data.tmdbId);
        const newHistory = [...state.progressHistory];
        
        if (existingIndex >= 0) {
          newHistory[existingIndex] = { ...newHistory[existingIndex], ...newEntry } as WatchingProgress;
        } else {
          newHistory.unshift({ id: 'temp-' + Date.now(), ...newEntry } as WatchingProgress);
        }
        
        return { progressHistory: newHistory };
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  },
}));

export default usePlayerStore;
