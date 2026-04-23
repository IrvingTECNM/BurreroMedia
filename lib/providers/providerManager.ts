/**
 * Provider Manager
 *
 * Central hub for managing all streaming/download providers.
 * Queries all active providers in parallel and aggregates results.
 */
import { IProvider, ProviderResponse, StreamResult, SubtitleResult } from './types';
class ProviderManager {
  private providers: Map<string, IProvider> = new Map();

  constructor() {
    // No default providers (except those registered dynamically by stores)
  }

  registerProvider(provider: IProvider): void {
    this.providers.set(provider.manifest.id, provider);
  }

  removeProvider(providerId: string): void {
    this.providers.delete(providerId);
  }

  getInstalledProviders(): IProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(providerId: string): IProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Query ALL active providers in parallel for streams/subtitles
   * related to a given TMDB item.
   */
  async searchStreams(
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number,
    onProgress?: (newStreams: StreamResult[]) => void
  ): Promise<{
    streams: StreamResult[];
    subtitles: SubtitleResult[];
  }> {
    const providerType = mediaType === 'tv' ? 'series' : 'movie';
    console.log(`[ProviderManager] Active providers pre-filter:`, this.getInstalledProviders().map(p => ({ id: p.manifest.id, url: (p as any).manifestUrl })));
    const activeProviders = this.getInstalledProviders().filter((p) =>
      p.manifest.types.includes(providerType) &&
      p.manifest.resources.includes('stream')
    );
    console.log(`[ProviderManager] Active providers post-filter:`, activeProviders.map(p => p.manifest.id));

    // Helper to pause execution
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Query all registered IProvider providers in parallel
    const providerResults = Promise.allSettled(
      activeProviders.map(async (p) => {
        let retries = 1;
        let lastError: any = null;
        
        while (retries >= 0) {
          console.log(`[ProviderManager] Querying Addon [${p.manifest.id}] for TMDB: ${tmdbId} (Retries left: ${retries})`);
          try {
            const res = await p.getStreams(tmdbId, providerType, season, episode);
            console.log(`[ProviderManager] Addon [${p.manifest.id}] returned ${res.streams?.length || 0} streams`);
            
            // Map and stream the results immediately to the UI
            if (res.streams && res.streams.length > 0 && onProgress) {
              const mappedStreams: StreamResult[] = res.streams.map((s: any) => ({
                title: s.description || s.title || s.name || 'Stream Desconocido',
                url: s.url || s.externalUrl,
                quality: (s.description?.includes('4K') || s.name?.includes('4K')) ? '4K' as const : '1080p' as const,
                language: s.description?.toLowerCase().includes('sub') ? 'en-sub' : 'es-lat',
                provider: s.name || 'Proveedor Externo',
                type: (s.url?.includes('magnet:') || s.infoHash) ? 'torrent' as const : 'direct' as const,
                isDownload: s.isDownload ?? (s.name?.includes('📥') || s.description?.includes('📥')),
              }));
              onProgress(mappedStreams);
            }
            
            return res;
          } catch (e: any) {
            lastError = e;
            console.warn(`[ProviderManager] Addon [${p.manifest.id}] failed:`, e.message);
            if (retries > 0) {
              console.log(`[ProviderManager] Retrying Addon [${p.manifest.id}] in 1s...`);
              await delay(1000);
            }
            retries--;
          }
        }
        throw lastError;
      })
    );

    // Also query our built-in Cinecalidad HTTP API wrapped with progress trigger
    const cinecalidadResult = (async () => {
      const streams = await this.fetchCinecalidadStreams(tmdbId, mediaType);
      if (streams && streams.length > 0 && onProgress) {
        onProgress(streams);
      }
      return streams;
    })();

    const [providerSettled, cinecalidadStreams] = await Promise.all([
      providerResults,
      cinecalidadResult,
    ]);

    const allStreams: StreamResult[] = [];
    const allSubtitles: SubtitleResult[] = [];

    // Collect from registered providers
    providerSettled.forEach((result) => {
      if (result.status === 'fulfilled') {
        // Map Stremio addon stream format to BurreroMedia StreamResult format
        const mappedStreams: StreamResult[] = (result.value.streams || []).map((s: any) => ({
          title: s.description || s.title || s.name || 'Stream Desconocido',
          url: s.url || s.externalUrl,
          quality: (s.description?.includes('4K') || s.name?.includes('4K')) ? '4K' as const : '1080p' as const,
          language: s.description?.toLowerCase().includes('sub') ? 'en-sub' : 'es-lat',
          provider: s.name || 'Proveedor Externo',
          type: (s.url?.includes('magnet:') || s.infoHash) ? 'torrent' as const : 'direct' as const,
          isDownload: s.isDownload ?? (s.name?.includes('📥') || s.description?.includes('📥')),
        }));
        
        allStreams.push(...mappedStreams);
        
        if (result.value.subtitles) {
          allSubtitles.push(...result.value.subtitles);
        }
      }
    });

    // Collect from Cinecalidad API
    allStreams.push(...cinecalidadStreams);

    // Sort streams by quality (highest first)
    const qualityOrder: Record<string, number> = {
      '4K': 4,
      '1080p': 3,
      '720p': 2,
      '480p': 1,
      'Unknown': 0,
    };

    allStreams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));

    return { streams: allStreams, subtitles: allSubtitles };
  }

  /**
   * Fetch streams from our built-in Cinecalidad serverless API.
   * Works on both localhost and production (Vercel).
   */
  private async fetchCinecalidadStreams(tmdbId: string, mediaType: string): Promise<StreamResult[]> {
    try {
      // Determine base URL dynamically
      let baseUrl = '';
      if (typeof window !== 'undefined') {
        baseUrl = window.location.origin;
      } else {
        baseUrl = 'http://localhost:8081';
      }

      const apiUrl = `${baseUrl}/api/cinecalidad/stream/${mediaType}/${tmdbId}`;
      console.log('[ProviderManager] Fetching Cinecalidad API:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) return [];

      const data = await response.json();
      
      // Map raw Cinecalidad response to StreamResult format
      return (data.streams || []).map((s: any) => ({
        title: s.description || s.name || 'Cinecalidad',
        url: s.url,
        quality: s.description?.includes('4K') ? '4K' as const : '1080p' as const,
        language: 'es-lat',
        provider: 'Cinecalidad',
        type: s.url?.includes('magnet:') ? 'torrent' as const : 'direct' as const,
        isDownload: s.isDownload ?? s.description?.includes('📥'),
      }));
    } catch (error) {
      console.error('[ProviderManager] Cinecalidad API error:', error);
      return [];
    }
  }
}

export const providerManager = new ProviderManager();
export default providerManager;
