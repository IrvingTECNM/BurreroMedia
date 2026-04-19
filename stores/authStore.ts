/**
 * Auth Store — Zustand
 *
 * Manages user authentication state with Supabase.
 * Supports the Netflix-style profile selection flow.
 */
import { create } from 'zustand';
import { supabase, Profile } from '@/lib/supabase';

interface AuthState {
  currentUser: Profile | null;
  allProfiles: Profile[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  loadProfiles: () => Promise<void>;
  login: (profileId: string, pin?: string) => Promise<boolean>;
  logout: () => void;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  allProfiles: [],
  isLoading: true,
  isAuthenticated: false,

  loadProfiles: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ allProfiles: data || [], isLoading: false });
    } catch (err) {
      console.error('Failed to load profiles:', err);
      set({ allProfiles: [], isLoading: false });
    }
  },

  login: async (profileId: string, pin?: string) => {
    const { allProfiles } = get();
    const profile = allProfiles.find((p) => p.id === profileId);

    if (!profile) return false;

    // Check PIN if profile has one
    if (profile.pin && profile.pin !== pin) {
      return false;
    }

    set({ currentUser: profile, isAuthenticated: true });
    return true;
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },

  createProfile: async ({ username, display_name, avatar_color, pin }) => {
    try {
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
        if (error.code === '23505') {
          return { success: false, error: 'Ese nombre de usuario ya existe' };
        }
        return { success: false, error: error.message };
      }

      // Add to local state
      set((state) => ({
        allProfiles: [...state.allProfiles, data],
      }));

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error al crear perfil' };
    }
  },

  updateProfile: async (profileId: string, updates: Partial<Profile>) => {
    try {
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

      return true;
    } catch (err) {
      return false;
    }
  },
}));

export default useAuthStore;
