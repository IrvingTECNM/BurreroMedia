import * as crypto from 'crypto';
import { curlFetch } from '@/lib/server/curl';

/**
 * Filemoon AES-GCM Extractor
 * 
 * Reverses the modern Filemoon/Byse encryption where the video source
 * is fetched from an internal API and decrypted locally by the React player.
 */

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface FilemoonSource {
  file: string;
  label?: string;
  type?: string;
}

/**
 * Decodes URL-safe base64 strings to Buffers
 */
function decodeBase64(str: string): Buffer {
  // Replace URL-safe characters
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if necessary
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
  return Buffer.from(padded, 'base64');
}

/**
 * Decrypts the playback payload using AES-256-GCM
 */
export function decryptPlayback(payloadB64: string, keyParts: string[], ivB64: string): any {
  try {
    // 1. Construct the 32-byte key from parts
    const key = Buffer.concat(keyParts.map(decodeBase64));
    
    // 2. Decode IV and Payload
    const iv = decodeBase64(ivB64);
    const fullPayload = decodeBase64(payloadB64);
    
    // 3. In AES-GCM, the Auth Tag is usually the last 16 bytes
    const tag = fullPayload.slice(-16);
    const encryptedData = fullPayload.slice(0, -16);
    
    // 4. Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('[Filemoon Lib] Decryption failed:', error);
    return null;
  }
}

/**
 * Fetch and extract Filemoon/Byse direct sources
 */
export async function extractFilemoon(embedUrl: string, referer?: string): Promise<string | null> {
  try {
    const urlObj = new URL(embedUrl);
    const host = urlObj.host;
    let id = urlObj.pathname.split('/').pop();
    if (id?.includes('embed-')) {
      id = id.split('embed-')[1].split('.')[0];
    }
    
    if (!id) return null;

    // 1. Fetch the playback config from the API
    const apiUrl = `https://${host}/api/videos/${id}/embed/playback`;
    
    // Use the provided referer or fallback to the cuevana default
    const origin = referer ? new URL(referer).origin : 'https://cue.cuevana3.nu';

    const headers = {
      'User-Agent': BROWSER_UA,
      'Referer': referer || embedUrl,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Embed-Origin': origin, 
    };
    
    console.log(`[Filemoon Lib] Fetching API: ${apiUrl}`);
    const response = curlFetch(apiUrl, { headers });
    
    if (!response || !response.trim().startsWith('{')) {
      console.error('[Filemoon Lib] Invalid API response');
      return null;
    }

    const data = JSON.parse(response);
    const playback = data.playback;
    
    if (!playback || !playback.payload || !playback.key_parts || !playback.iv) {
      console.error('[Filemoon Lib] Missing crypto parts in response');
      return null;
    }

    // 2. Decrypt the payload
    const decrypted = decryptPlayback(playback.payload, playback.key_parts, playback.iv);
    
    if (decrypted && decrypted.sources && Array.isArray(decrypted.sources) && decrypted.sources.length > 0) {
      // Find the best quality or just the first m3u8
      const source = decrypted.sources.find((s: any) => s && (s.url || s.file) && (s.url || s.file).includes('.m3u8')) || decrypted.sources[0];
      return source?.url || source?.file || null;
    }

  } catch (error) {
    console.error('[Filemoon Lib] Extraction Error:', error);
  }
  return null;
}
