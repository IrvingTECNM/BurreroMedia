import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { useDownloadStore } from '@/stores/downloadStore';

class DownloadManager {
  private activeDownloads: Record<string, any> = {};

  async startDownload(id: string) {
    if (Platform.OS === 'web') {
      console.warn('Downloads via FileSystem are not supported on Web. Trying browser download.');
      const item = useDownloadStore.getState().downloads[id];
      if (item) {
        window.open(item.url, '_blank');
        useDownloadStore.getState().setState(id, 'completed');
      }
      return;
    }

    const store = useDownloadStore.getState();
    const item = store.downloads[id];
    if (!item || item.state === 'downloading') return;

    store.setState(id, 'downloading');

    try {
      const extension = item.url.includes('.m3u8') ? 'm3u8' : 'mp4';
      const safeTitle = item.title.replace(/[^a-zA-Z0-9]/g, '_');
      const fileUri = `${FileSystem.documentDirectory || 'file:///'}${safeTitle}_${item.id}.${extension}`;

      const callback = (downloadProgress: any) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        useDownloadStore.getState().updateProgress(id, progress);
      };

      let downloadResumable: any;

      if (item.resumableData) {
        const parsed = JSON.parse(item.resumableData);
        downloadResumable = FileSystem.createDownloadResumable(
          item.url,
          fileUri,
          {},
          callback,
          parsed
        );
      } else {
        downloadResumable = FileSystem.createDownloadResumable(
          item.url,
          fileUri,
          {},
          callback
        );
      }

      this.activeDownloads[id] = downloadResumable;

      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        useDownloadStore.getState().setLocalUri(id, result.uri);
        useDownloadStore.getState().setState(id, 'completed');
        delete this.activeDownloads[id];
      }

    } catch (e: any) {
      console.error(`Download failed for ${id}:`, e);
      useDownloadStore.getState().setState(id, 'error', e.message);
      delete this.activeDownloads[id];
    }
  }

  async pauseDownload(id: string) {
    if (Platform.OS === 'web') return;
    
    const downloadResumable = this.activeDownloads[id];
    if (downloadResumable) {
      try {
        const pauseResult = await downloadResumable.pauseAsync();
        if (pauseResult) {
          useDownloadStore.getState().setResumableData(id, JSON.stringify(pauseResult));
          useDownloadStore.getState().setState(id, 'paused');
          delete this.activeDownloads[id];
        }
      } catch (e) {
        console.error('Error pausing download:', e);
      }
    }
  }

  async resumeDownload(id: string) {
    this.startDownload(id);
  }

  async cancelDownload(id: string) {
    if (Platform.OS === 'web') return;

    const downloadResumable = this.activeDownloads[id];
    if (downloadResumable) {
      try {
        await downloadResumable.cancelAsync();
        delete this.activeDownloads[id];
      } catch (e) {
        console.error('Error canceling download:', e);
      }
    }
    await useDownloadStore.getState().removeDownload(id);
  }
}

export const downloadManager = new DownloadManager();
