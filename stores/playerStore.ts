/**
 * Player Store — Zustand
 *
 * Manages video playback progress and syncs with Supabase.
 * No persist middleware — progress is loaded from Supabase on login.
 */
import { create } from 'zustand';
import { ensureSupabaseSession, supabase, WatchingProgress } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { StreamResult, SubtitleResult } from '@/lib/providers/types';

interface PlayerState {
  progressHistory: WatchingProgress[];
  activeStreams: StreamResult[];
  activeSubtitles: SubtitleResult[];
  
  // Actions
  setActiveStreams: (streams: StreamResult[]) => void;
  setActiveSubtitles: (subtitles: SubtitleResult[]) => void;
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
  activeStreams: [],
  activeSubtitles: [],

  setActiveStreams: (streams) => set({ activeStreams: streams }),
  setActiveSubtitles: (subtitles) => set({ activeSubtitles: subtitles }),

  loadProgressHistory: async () => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    try {
      await ensureSupabaseSession();

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
      await ensureSupabaseSession();

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
