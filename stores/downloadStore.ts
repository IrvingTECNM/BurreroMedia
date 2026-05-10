import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export type DownloadState = 'idle' | 'downloading' | 'paused' | 'completed' | 'error';

export interface DownloadItem {
  id: string; // unique download id (could be media ID or specific)
  mediaId: string; // TMDB media ID
  type: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  serverName: string;
  url: string; // remote URL
  localUri?: string; // downloaded file path
  progress: number; // 0 to 1
  state: DownloadState;
  error?: string;
  resumableData?: string; // snapshot data for expo-file-system pausing
  createdAt: number;
}

interface DownloadStore {
  downloads: Record<string, DownloadItem>;
  addDownload: (item: Omit<DownloadItem, 'progress' | 'state' | 'createdAt'>) => void;
  updateProgress: (id: string, progress: number) => void;
  setState: (id: string, state: DownloadState, error?: string) => void;
  setLocalUri: (id: string, uri: string) => void;
  setResumableData: (id: string, data: string) => void;
  removeDownload: (id: string) => Promise<void>;
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, get) => ({
      downloads: {},

      addDownload: (item) => set((state) => ({
        downloads: {
          ...state.downloads,
          [item.id]: {
            ...item,
            progress: 0,
            state: 'idle',
            createdAt: Date.now(),
          }
        }
      })),

      updateProgress: (id, progress) => set((state) => {
        const item = state.downloads[id];
        if (!item) return state;
        return {
          downloads: {
            ...state.downloads,
            [id]: { ...item, progress }
          }
        };
      }),

      setState: (id, status, error) => set((state) => {
        const item = state.downloads[id];
        if (!item) return state;
        return {
          downloads: {
            ...state.downloads,
            [id]: { ...item, state: status, error }
          }
        };
      }),

      setLocalUri: (id, uri) => set((state) => {
        const item = state.downloads[id];
        if (!item) return state;
        return {
          downloads: {
            ...state.downloads,
            [id]: { ...item, localUri: uri }
          }
        };
      }),

      setResumableData: (id, data) => set((state) => {
        const item = state.downloads[id];
        if (!item) return state;
        return {
          downloads: {
            ...state.downloads,
            [id]: { ...item, resumableData: data }
          }
        };
      }),

      removeDownload: async (id) => {
        const item = get().downloads[id];
        if (item?.localUri) {
          try {
            await FileSystem.deleteAsync(item.localUri, { idempotent: true });
          } catch (e) {
            console.error('Failed to delete file:', e);
          }
        }
        set((state) => {
          const newDownloads = { ...state.downloads };
          delete newDownloads[id];
          return { downloads: newDownloads };
        });
      },
    }),
    {
      name: 'burreromedia-downloads',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
