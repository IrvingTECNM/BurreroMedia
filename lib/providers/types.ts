/**
 * Provider System Types
 *
 * Defines the contract for streaming/download providers.
 * Inspired by Stremio's addon architecture.
 */

export interface ProviderManifest {
  id: string;
  name: string;
  version: string;
  icon: string;
  description: string;
  resources: ('catalog' | 'stream' | 'subtitle')[];
  types: ('movie' | 'series')[];
}

export interface StreamResult {
  title: string;           // "1080p - Latino"
  url: string;             // Direct URL or embed URL
  quality: '4K' | '1080p' | '720p' | '480p' | 'Unknown';
  language: string;        // "es-lat", "es-es", "en"
  provider: string;        // Provider name
  type: 'direct' | 'embed' | 'torrent';
  isDownload?: boolean;   // Whether this is a direct download link (Mega, 1fichier, etc.)
  size?: string;           // "2.1 GB"
  seeds?: number;          // For torrents
  behaviorHints?: {
    isDirect?: boolean;
    notWebReady?: boolean;
  };
}

export interface SubtitleResult {
  language: string;        // "es", "en"
  label: string;           // "Español (Latinoamérica)"
  url: string;             // URL to .vtt or .srt file
}

export interface ProviderResponse {
  streams: StreamResult[];
  subtitles?: SubtitleResult[];
}

export interface IProvider {
  manifest: ProviderManifest;
  getStreams(tmdbId: string, mediaType: 'movie' | 'series', season?: number, episode?: number): Promise<ProviderResponse>;
}
