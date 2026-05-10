import { execSync } from 'child_process';

/**
 * StreamSB / SBFast / SBPlay Extractor
 * 
 * StreamSB uses a hex-encoding scheme to construct the API endpoint URL.
 * The video ID from the embed URL is converted to hex characters,
 * then used to construct a URL like:
 *   /sources{HEX_PREFIX}{HEX_ENCODED_ID}
 * which returns JSON with the actual M3U8 streaming URL.
 *
 * Known domains: sbfast.com, sbplay.org, sbembed.com, sblongvu.com,
 *                sbbrisk.com, sbface.com, sbspeed.com, streamsb.net
 */

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Convert a string to its hex representation
 */
function stringToHex(str: string): string {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try {
    return execSync(`curl -s -L --max-time 15 ${headerArgs} "${url}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return '';
  }
}

/**
 * Extracts the M3U8 streaming URL from a StreamSB/SBFast embed page.
 */
export async function extractStreamSB(embedUrl: string): Promise<string | null> {
  try {
    // Extract the video ID from the embed URL
    // Patterns: /e/XXXXX, /embed-XXXXX.html, /play/XXXXX
    const idMatch = embedUrl.match(/\/(?:e|play|embed-?)\/([a-zA-Z0-9]+)/);
    if (!idMatch) {
      console.log(`[Extractor:StreamSB] Could not extract video ID from: ${embedUrl}`);
      return null;
    }
    const videoId = idMatch[1];
    
    // Extract the domain from the embed URL
    const domainMatch = embedUrl.match(/https?:\/\/([^\/]+)/);
    if (!domainMatch) return null;
    const baseDomain = domainMatch[0];
    
    console.log(`[Extractor:StreamSB] Video ID: ${videoId}, Domain: ${baseDomain}`);

    // StreamSB uses multiple API endpoint patterns. Try them in order.
    // The hex-encoded payload follows a pattern like: "||videoId||" or specific prefixes
    const hexPayloads = [
      // Pattern 1: Standard hex encoding
      `7361696b6f757c7c${stringToHex(videoId)}7c7c7361696b6f757c7c73747265616d7362`,
      // Pattern 2: Alternative prefix
      `6272363a7c7c${stringToHex(videoId)}7c7c6272363a7c7c73747265616d7362`,
      // Pattern 3: Simpler
      `${stringToHex(`||${videoId}||`)}`,
    ];

    const apiPaths = [
      '/sources43',
      '/sources41',
      '/sources39',
      '/sources37',
      '/sources35',
      '/sources33',
      '/sources16',
      '/sources',
    ];

    for (const path of apiPaths) {
      for (const hex of hexPayloads) {
        const apiUrl = `${baseDomain}${path}${hex}`;
        console.log(`[Extractor:StreamSB] Trying: ${path}${hex.substring(0, 20)}...`);

        const response = curlFetch(apiUrl, {
          'Referer': embedUrl,
          'watchsb': 'sbstream',
        });

        if (!response || !response.trim().startsWith('{')) continue;

        try {
          const data = JSON.parse(response);
          
          // The response JSON usually has: { stream_data: { file: "...m3u8..." } }
          // or: { data: [ { file: "..." } ] }
          const m3u8Url = 
            data?.stream_data?.file ||
            data?.data?.[0]?.file ||
            data?.data?.file ||
            data?.file ||
            data?.source?.[0]?.file;

          if (m3u8Url && (m3u8Url.includes('.m3u8') || m3u8Url.includes('.mp4') || m3u8Url.startsWith('http'))) {
            console.log(`[Extractor:StreamSB] ✅ Found M3U8: ${m3u8Url.substring(0, 80)}...`);
            return m3u8Url;
          }
        } catch (parseErr) {
          continue;
        }
      }
    }

    // Fallback: Try to find the M3U8 URL directly in the embed page HTML
    console.log('[Extractor:StreamSB] API methods failed, trying HTML fallback...');
    const html = curlFetch(embedUrl, { 'Referer': embedUrl });
    
    if (html && html.length > 1000) {
      // Some versions expose the source directly in JS
      const sourceMatch = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
      if (sourceMatch) {
        console.log(`[Extractor:StreamSB] ✅ Found M3U8 in HTML: ${sourceMatch[1].substring(0, 80)}...`);
        return sourceMatch[1];
      }

      // Check for file URL in JSON config
      const jsonMatch = html.match(/["']file["']\s*:\s*["'](https?:\/\/[^"']+)["']/);
      if (jsonMatch) {
        console.log(`[Extractor:StreamSB] ✅ Found file in config: ${jsonMatch[1].substring(0, 80)}...`);
        return jsonMatch[1];
      }
    }

    console.log('[Extractor:StreamSB] ❌ All extraction methods failed');
    return null;
  } catch (err) {
    console.error('[Extractor:StreamSB] Error:', err);
    return null;
  }
}
