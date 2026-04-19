import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { providerManager } from '@/lib/providers/providerManager';
import { RemoteProvider } from '@/lib/providers/remoteProvider';

export interface InstalledProvider {
  url: string;
  id: string;
  name: string;
  icon?: string;
  version: string;
}

interface ProvidersState {
  installedProviders: InstalledProvider[];
  isLoading: boolean;
  
  // Actions
  initializeProviders: () => Promise<void>;
  installProvider: (manifestUrl: string) => Promise<{ success: boolean; error?: string }>;
  uninstallProvider: (id: string) => void;
}

const safeStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }
};

const STORAGE_KEY = 'burreromedia-providers';

export const useProvidersStore = create<ProvidersState>((set, get) => ({
  installedProviders: [],
  isLoading: false,

  initializeProviders: async () => {
    set({ isLoading: true });
    
    // Load from local storage manually
    try {
      const stored = await safeStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as InstalledProvider[];
        set({ installedProviders: parsed });
      }
    } catch (err) {
      console.warn('Failed to load providers from storage', err);
    }

    const { installedProviders } = get();
    
    // Re-hydrate the providerManager natively
    for (const provider of installedProviders) {
      try {
        const remoteProvider = new RemoteProvider(provider.url);
        await remoteProvider.initialize();
        providerManager.registerProvider(remoteProvider);
      } catch (e) {
        console.error(`Failed to initialize provider ${provider.url}`, e);
      }
    }
    set({ isLoading: false });
  },

  installProvider: async (manifestUrl: string) => {
    set({ isLoading: true });
    
    // Check if already exist
    const exists = get().installedProviders.some(p => p.url === manifestUrl);
    if (exists) {
      set({ isLoading: false });
      return { success: false, error: 'El proveedor ya está instalado' };
    }

    try {
      const remoteProvider = new RemoteProvider(manifestUrl);
      await remoteProvider.initialize(); // Fetch and validate manifest
      
      providerManager.registerProvider(remoteProvider);
      
      const newProvider = {
        url: manifestUrl,
        id: remoteProvider.manifest.id,
        name: remoteProvider.manifest.name,
        icon: remoteProvider.manifest.icon,
        version: remoteProvider.manifest.version,
      };

      const newInstalled = [...get().installedProviders, newProvider];
      
      set({ installedProviders: newInstalled, isLoading: false });
      
      // Save state
      await safeStorage.setItem(STORAGE_KEY, JSON.stringify(newInstalled));

      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: error.message || 'Error instalando Addon' };
    }
  },

  uninstallProvider: async (id: string) => {
    providerManager.removeProvider(id);
    const newInstalled = get().installedProviders.filter((p) => p.id !== id);
    set({ installedProviders: newInstalled });
    await safeStorage.setItem(STORAGE_KEY, JSON.stringify(newInstalled));
  },
}));
