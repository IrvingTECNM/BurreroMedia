/**
 * Provider Manager
 *
 * Central hub for managing all streaming/download providers.
 * Queries all active providers in parallel and aggregates results.
 */
import { IProvider, ProviderResponse, StreamResult, SubtitleResult } from './types';
import { demoProvider } from './demoProvider';

class ProviderManager {
  private providers: Map<string, IProvider> = new Map();

  constructor() {
    // Register the demo provider by default
    this.registerProvider(demoProvider);
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
    episode?: number
  ): Promise<{
    streams: StreamResult[];
    subtitles: SubtitleResult[];
  }> {
    const providerType = mediaType === 'tv' ? 'series' : 'movie';
    const activeProviders = this.getInstalledProviders().filter((p) =>
      p.manifest.types.includes(providerType) &&
      p.manifest.resources.includes('stream')
    );

    // Query all providers in parallel
    const results = await Promise.allSettled(
      activeProviders.map((p) =>
        p.getStreams(tmdbId, providerType, season, episode)
      )
    );

    const allStreams: StreamResult[] = [];
    const allSubtitles: SubtitleResult[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allStreams.push(...result.value.streams);
        if (result.value.subtitles) {
          allSubtitles.push(...result.value.subtitles);
        }
      }
      // Silently skip failed providers to not block the user
    });

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
}

export const providerManager = new ProviderManager();
export default providerManager;
