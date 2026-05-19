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

    // Set to keep track of seen URLs to prevent any duplicates across progressive updates
    const seenUrls = new Set<string>();

    const safeOnProgress = (newStreams: StreamResult[]) => {
      if (!onProgress) return;
      const filtered = newStreams.filter(s => {
        if (!s.url) return true;
        if (seenUrls.has(s.url)) return false;
        seenUrls.add(s.url);
        return true;
      });
      if (filtered.length > 0) {
        onProgress(filtered);
      }
    };

    // Query all registered IProvider providers in parallel
    const providerSettled = await Promise.allSettled(
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
                quality: (s.description?.match(/4K|2160/i)) ? '4K' as const 
                  : (s.description?.match(/1080|FHD/i)) ? '1080p' as const 
                  : (s.description?.match(/720/i)) ? '720p' as const 
                  : (s.description?.match(/480|360/i)) ? '480p' as const 
                  : '1080p' as const,
                language: s.description?.toLowerCase().includes('latino') ? 'es-lat' 
                  : s.description?.toLowerCase().includes('subtitulado') ? 'en-sub' 
                  : s.description?.toLowerCase().includes('español') ? 'es-es'
                  : s.description?.toLowerCase().includes('sub') ? 'en-sub' : 'es-lat',
                provider: s.name || 'Proveedor Externo',
                type: (s.url?.includes('magnet:') || s.infoHash) ? 'torrent' as const : 'direct' as const,
                isDownload: s.isDownload ?? (s.name?.includes('📥') || s.description?.includes('📥')),
              }));
              safeOnProgress(mappedStreams);
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

    const allStreams: StreamResult[] = [];
    const allSubtitles: SubtitleResult[] = [];

    // Collect from registered providers
    providerSettled.forEach((result) => {
      if (result.status === 'fulfilled') {
        // Map Stremio addon stream format to BurreroMedia StreamResult format
        const mappedStreams: StreamResult[] = (result.value.streams || []).map((s: any) => ({
          title: s.description || s.title || s.name || 'Stream Desconocido',
          url: s.url || s.externalUrl,
          quality: (s.description?.match(/4K|2160/i)) ? '4K' as const 
                  : (s.description?.match(/1080|FHD/i)) ? '1080p' as const 
                  : (s.description?.match(/720/i)) ? '720p' as const 
                  : (s.description?.match(/480|360/i)) ? '480p' as const 
                  : '1080p' as const,
                language: s.description?.toLowerCase().includes('latino') ? 'es-lat' 
                  : s.description?.toLowerCase().includes('subtitulado') ? 'en-sub' 
                  : s.description?.toLowerCase().includes('español') ? 'es-es'
                  : s.description?.toLowerCase().includes('sub') ? 'en-sub' : 'es-lat',
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

    // Deduplicate all collected streams by URL
    const finalSeenUrls = new Set<string>();
    const uniqueStreams = allStreams.filter(s => {
      if (!s.url) return true;
      if (finalSeenUrls.has(s.url)) return false;
      finalSeenUrls.add(s.url);
      return true;
    });

    // Sort streams: direct playable first, then by quality (highest first), then by language preference
    const qualityOrder: Record<string, number> = {
      '4K': 4,
      '1080p': 3,
      '720p': 2,
      '480p': 1,
      'Unknown': 0,
    };
    const langOrder = (lang: string) => {
      if (lang === 'es-lat') return 0;  // Latino first
      if (lang === 'es-es') return 1;   // Español Spain second
      if (lang === 'en-sub') return 2;  // Subtitulado third
      return 3;
    };

    uniqueStreams.sort((a, b) => {
      // 1. Quality: highest first
      const qualDiff = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
      if (qualDiff !== 0) return qualDiff;

      // 2. Direct playable streams (type === 'direct') over embeds
      if (a.type === 'direct' && b.type !== 'direct') return -1;
      if (b.type === 'direct' && a.type !== 'direct') return 1;

      // 3. Language preference
      return langOrder(a.language) - langOrder(b.language);
    });

    return { streams: uniqueStreams, subtitles: allSubtitles };
  }
}

export const providerManager = new ProviderManager();
export default providerManager;
