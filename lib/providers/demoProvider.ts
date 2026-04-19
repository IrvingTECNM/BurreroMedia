/**
 * Demo Provider — Creative Commons Content
 *
 * Provides free, open-source video content for testing the player
 * and the provider architecture. Uses Blender Foundation films.
 */
import { IProvider, ProviderManifest, ProviderResponse } from './types';

const DEMO_STREAMS: Record<string, ProviderResponse> = {
  // We map some well-known TMDB IDs to demo streams
  // These are placeholder mappings — the real value is in the architecture
  'demo-default': {
    streams: [
      {
        title: 'Big Buck Bunny - 1080p',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '1080p',
        language: 'en',
        provider: 'Demo Provider',
        type: 'direct',
        size: '158 MB',
      },
      {
        title: 'Sintel - 720p',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        quality: '720p',
        language: 'en',
        provider: 'Demo Provider',
        type: 'direct',
        size: '130 MB',
      },
      {
        title: 'Elephants Dream - 480p',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        quality: '480p',
        language: 'en',
        provider: 'Demo Provider',
        type: 'direct',
        size: '80 MB',
      },
      {
        title: 'Tears of Steel - 720p',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        quality: '720p',
        language: 'en',
        provider: 'Demo Provider',
        type: 'direct',
        size: '160 MB',
      },
    ],
    subtitles: [
      {
        language: 'en',
        label: 'English',
        url: 'https://raw.githubusercontent.com/nicholasgasior/gopher-stream/master/test/fixtures/sample.vtt',
      },
    ],
  },
};

class DemoProvider implements IProvider {
  manifest: ProviderManifest = {
    id: 'demo-provider',
    name: 'Demo Provider',
    version: '1.0.0',
    icon: '🎬',
    description: 'Creative Commons content for testing (Big Buck Bunny, Sintel, etc.)',
    resources: ['stream'],
    types: ['movie', 'series'],
  };

  async getStreams(
    _tmdbId: string,
    _mediaType: 'movie' | 'series',
    _season?: number,
    _episode?: number
  ): Promise<ProviderResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // For demo purposes, return the same set of demo streams for any content
    return DEMO_STREAMS['demo-default'];
  }
}

export const demoProvider = new DemoProvider();
export default demoProvider;
