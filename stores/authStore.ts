/**
 * Auth Store — Zustand
 *
 * Manages user authentication state with Supabase.
 * Supports the Netflix-style profile selection flow.
 *
 * Session persistence is handled manually via localStorage
 * to avoid issues with zustand persist + SSR + AsyncStorage.
 */
import { create } from 'zustand';
import { ensureSupabaseSession, supabase, Profile } from '@/lib/supabase';
import { Platform } from 'react-native';

interface AuthState {
  currentUser: Profile | null;
  allProfiles: Profile[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  loadProfiles: () => Promise<void>;
  login: (profileId: string, pin?: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => void;
  createProfile: (data: {
    username: string;
    display_name: string;
    avatar_color: string;
    pin?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (profileId: string, data: Partial<Profile>) => Promise<boolean>;
}

const AVATAR_COLORS = [
  '#E50914', '#FFD700', '#4FC3F7', '#81C784',
  '#FF7043', '#BA68C8', '#FF8A65', '#64B5F6',
];

// --- Manual localStorage helpers (SSR-safe) ---
const STORAGE_KEY = 'burrero-auth-session';

function saveSession(user: Profile) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentUser: user,
        isAuthenticated: true,
      }));
    }
  } catch (e) {
    console.warn('[AuthStore] Failed to save session:', e);
  }
}

function clearSession() {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[AuthStore] Failed to clear session:', e);
  }
}

function loadSession(): { currentUser: Profile; isAuthenticated: boolean } | null {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.currentUser?.id) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[AuthStore] Failed to load session:', e);
  }
  return null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  allProfiles: [],
  isLoading: false,
  isAuthenticated: false,

  /**
   * Restore session from localStorage on app boot.
   * Called once from _layout.tsx.
   */
  restoreSession: () => {
    const saved = loadSession();
    if (saved) {
      console.log('[AuthStore] Session restored for:', saved.currentUser.display_name);
      set({
        currentUser: saved.currentUser,
        isAuthenticated: true,
      });
    }
  },

  loadProfiles: async () => {
    // Prevent concurrent calls
    if (get().isLoading) return;

    console.log('[AuthStore] Loading profiles from Supabase...');
    set({ isLoading: true });

    try {
      await ensureSupabaseSession();

      // Add a timeout so it doesn't hang forever
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
        .abortSignal(controller.signal);

      clearTimeout(timeout);

      if (error) {
        console.error('[AuthStore] Supabase error:', error);
        throw error;
      }

      console.log('[AuthStore] Profiles loaded:', data?.length || 0);
      set({ allProfiles: data || [], isLoading: false });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error('[AuthStore] Profile fetch timed out');
      } else {
        console.error('[AuthStore] Failed to load profiles:', err);
      }
      set({ isLoading: false });
    }
  },

  login: async (profileId: string, pin?: string) => {
    console.log('[AuthStore] Logging in profile:', profileId);
    let { allProfiles } = get();

    // If profiles aren't loaded yet, load them first
    if (allProfiles.length === 0) {
      await get().loadProfiles();
      allProfiles = get().allProfiles;
    }

    const profile = allProfiles.find((p) => p.id === profileId);

    if (!profile) {
      console.warn('[AuthStore] Profile not found:', profileId);
      return false;
    }

    // Check PIN if profile has one
    if (profile.pin && profile.pin !== pin) {
      console.warn('[AuthStore] PIN mismatch');
      return false;
    }

    set({ currentUser: profile, isAuthenticated: true });
    saveSession(profile); // Persist to localStorage
    console.log('[AuthStore] Login successful');
    return true;
  },

  logout: () => {
    console.log('[AuthStore] Logging out');
    set({ currentUser: null, isAuthenticated: false });
    clearSession();
  },

  createProfile: async ({ username, display_name, avatar_color, pin }) => {
    console.log('[AuthStore] Creating profile:', username);
    try {
      await ensureSupabaseSession();

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          username: username.toLowerCase().trim(),
          display_name,
          avatar_color: avatar_color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          pin: pin || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[AuthStore] Create profile error:', error);
        if (error.code === '23505') {
          return { success: false, error: 'Ese nombre de usuario ya existe' };
        }
        return { success: false, error: error.message };
      }

      // Add to local state
      set((state) => ({
        allProfiles: [...state.allProfiles, data],
      }));

      console.log('[AuthStore] Profile created successfully');
      return { success: true };
    } catch (err) {
      console.error('[AuthStore] Exception in createProfile:', err);
      return { success: false, error: 'Error al crear perfil' };
    }
  },

  updateProfile: async (profileId: string, updates: Partial<Profile>) => {
    console.log('[AuthStore] Updating profile:', profileId);
    try {
      await ensureSupabaseSession();

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        allProfiles: state.allProfiles.map((p) =>
          p.id === profileId ? { ...p, ...updates } : p
        ),
        currentUser:
          state.currentUser?.id === profileId
            ? { ...state.currentUser, ...updates }
            : state.currentUser,
      }));

      console.log('[AuthStore] Profile updated');
      return true;
    } catch (err) {
      console.error('[AuthStore] Update profile error:', err);
      return false;
    }
  },
}));

export default useAuthStore;
