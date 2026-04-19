/**
 * Supabase Client Configuration
 * 
 * Uses AsyncStorage for persistent auth sessions on mobile,
 * and a safe localStorage wrapper on web (avoids SSR crashes).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://nvcvenpceghyfwkyvuah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52Y3ZlbnBjZWdoeWZ3a3l2dWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDA5OTMsImV4cCI6MjA5MjExNjk5M30.HjzazOYQasnkEbjowNC5VLBWN27KKZ56Zgc62uJr1eU';

/**
 * SSR-safe storage adapter for web.
 * Falls back to no-op when `window`/`localStorage` is unavailable (SSR).
 */
const webStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// --- Database Types ---

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_color: string;
  pin: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  status: 'want_to_watch' | 'watching' | 'watched';
  rating: number | null;
  added_at: string;
}

export interface Recommendation {
  id: string;
  from_user: string;
  to_user: string | null;
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  message: string | null;
  created_at: string;
  // Joined data
  from_profile?: Profile;
}

export interface WatchingProgress {
  id: string;
  user_id: string;
  tmdb_id: string;
  media_type: 'movie' | 'tv';
  position_seconds: number; // seconds
  duration: number; // seconds
  season?: number;
  episode?: number;
  updated_at: string;
}

export interface ProviderConfig {
  id: string;
  provider_id: string;
  name: string;
  base_url: string;
  icon_url: string | null;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export default supabase;
