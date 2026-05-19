import { spawnSync } from 'child_process';

interface CurlOptions {
  headers?: Record<string, string>;
  maxTimeSeconds?: number;
  maxBuffer?: number;
}

const DEFAULT_MAX_TIME_SECONDS = 15;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

function buildHeaderArgs(headers: Record<string, string> = {}) {
  return Object.entries(headers).flatMap(([key, value]) => ['-H', `${key}: ${value}`]);
}

export function curlFetch(url: string, options: CurlOptions = {}): string {
  const result = spawnSync('curl', [
    '-s',
    '-L',
    '--max-time',
    String(options.maxTimeSeconds ?? DEFAULT_MAX_TIME_SECONDS),
    ...buildHeaderArgs(options.headers),
    url,
  ], {
    encoding: 'utf-8',
    maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
  });

  if (result.error || result.status !== 0) {
    return '';
  }

  return result.stdout || '';
}

export function curlRedirectUrl(url: string, options: CurlOptions = {}): string {
  const result = spawnSync('curl', [
    '-s',
    '-o',
    process.platform === 'win32' ? 'NUL' : '/dev/null',
    '-w',
    '%{redirect_url}',
    '--max-time',
    String(options.maxTimeSeconds ?? 10),
    ...buildHeaderArgs(options.headers),
    url,
  ], {
    encoding: 'utf-8',
    maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
  });

  if (result.error || result.status !== 0) {
    return '';
  }

  return (result.stdout || '').trim();
}
