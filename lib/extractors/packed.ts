import * as cheerio from 'cheerio';
import { execSync } from 'child_process';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Standard Dean Edwards Packer Unpacker
 * Decodes JS obfuscated with eval(function(p,a,c,k,e,d)...)
 */
function unpack(packed: string): string {
  try {
    const pMatch = packed.match(/eval\(function\(p,a,c,k,e,d\).*?return p}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/);
    if (!pMatch) return '';
    let [_, p, aStr, cStr, kStr] = pMatch;
    let a = parseInt(aStr, 10);
    let c = parseInt(cStr, 10);
    let k = kStr.split('|');

    const e = function (idx: number) {
      return (idx < a ? '' : e(Math.floor(idx / a))) + ((idx % a) > 35 ? String.fromCharCode((idx % a) + 29) : (idx % a).toString(36));
    };

    while (c--) {
      if (k[c]) {
        p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
      }
    }
    return p;
  } catch (e) {
    return '';
  }
}

/**
 * Fetch a URL using curl (bypasses Cloudflare and ensures consistent behavior in server-side context).
 */
function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };

  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');

  try {
    const result = execSync(
      `curl -s -L --max-time 15 ${headerArgs} "${url}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return result;
  } catch {
    return '';
  }
}

/**
 * Generic extractor for servers that use Dean Edwards packed JS to hide the m3u8 url.
 * Works for: Vimeos, Goodstream, Hlswish, Streamwish, Filelions, etc.
 * 
 * Uses curl for fetching to ensure consistency in the Expo server-side environment.
 */
export async function extractGenericPacked(embedUrl: string): Promise<string | null> {
  try {
    console.log(`[Extractor:Packed] Fetching: ${embedUrl}`);
    const html = curlFetch(embedUrl);
    
    if (!html || html.includes('Just a moment') || html.length < 500) {
      console.log(`[Extractor:Packed] Blocked or empty response for ${embedUrl}`);
      return null;
    }
    
    const $ = cheerio.load(html);
    let foundUrl: string | null = null;

    $('script').each((i, el) => {
      if (foundUrl) return;
      const text = $(el).html() || '';
      
      // Match Dean Edwards Packer
      if (text.includes('eval(function(p,a,c,k,e,d)')) {
        const unpacked = unpack(text);
        if (!unpacked) return;
        
        // Primary: direct m3u8 or mp4 URL
        const matches = unpacked.match(/(https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)/);
        if (matches) {
          foundUrl = matches[1];
          console.log(`[Extractor:Packed] ✅ Found packed URL: ${foundUrl.substring(0, 80)}...`);
        } else {
          // Secondary: JSON key/value
          const match2 = unpacked.match(/['"](?:file|src|hls)['"]\s*:\s*['"]([^'"]+)['"]/);
          if (match2) {
            foundUrl = match2[1];
            console.log(`[Extractor:Packed] ✅ Found JSON URL: ${foundUrl.substring(0, 80)}...`);
          }
        }
      } else if (text.includes('sources:') || text.includes('"file"') || text.includes("'file'")) {
        // Unpacked JW-style sources array
        const matches = text.match(/(https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)/);
        if (matches) {
          foundUrl = matches[1];
          console.log(`[Extractor:Packed] ✅ Found plain URL: ${foundUrl.substring(0, 80)}...`);
        }
      }
    });

    if (!foundUrl) {
      console.log(`[Extractor:Packed] ❌ No URL found in ${embedUrl}`);
    }

    return foundUrl;
  } catch (err) {
    console.error(`[Extractor:Packed] Failed for ${embedUrl}:`, err);
    return null;
  }
}
