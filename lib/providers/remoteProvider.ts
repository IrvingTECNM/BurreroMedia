import { IProvider, ProviderManifest, ProviderResponse } from './types';

export class RemoteProvider implements IProvider {
  public manifest!: ProviderManifest;
  private manifestUrl: string;

  constructor(manifestUrl: string) {
    this.manifestUrl = manifestUrl;
  }

  /**
   * Fetches the remote manifest.json and validates it.
   */
  async initialize(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(this.manifestUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error('Network response matching manifest was not ok');
      const data = await res.json();
      
      // Basic validation
      if (!data.id || !data.name || !data.resources || !data.types) {
        throw new Error('Manifest lacks required stremio-like fields');
      }

      this.manifest = data as ProviderManifest;
    } catch (e: any) {
      throw new Error(`Failed to load manifest: ${e.message}`);
    }
  }

  /**
   * Translates BurreroMedia request into a Remote Add-on endpoint call
   */
  async getStreams(
    tmdbId: string,
    mediaType: 'movie' | 'series',
    season?: number,
    episode?: number
  ): Promise<ProviderResponse> {
    if (!this.manifest.resources.includes('stream')) {
      return { streams: [] };
    }

    try {
      // Assuming a generic stream endpoint structure compatible with standard Stremio logic:
      // baseURL/stream/movie/tt12345.json 
      // But BurreroMedia operates natively with tmdb_id, so the add-on must support tmdb: string prefix
      const baseUrl = this.manifestUrl.replace('/manifest.json', '');
      
      let resourceUrl = '';
      if (mediaType === 'movie') {
        resourceUrl = `${baseUrl}/stream/movie/tmdb:${tmdbId}.json`;
      } else {
        resourceUrl = `${baseUrl}/stream/series/tmdb:${tmdbId}:${season}:${episode}.json`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds timeout for scraping
      const res = await fetch(resourceUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return { streams: [] };

      const json = await res.json();
      return json as ProviderResponse;
    } catch (error) {
      console.warn(`[RemoteProvider] Error fetching streams from ${this.manifest.name}:`, error);
      return { streams: [] };
    }
  }
}
