import { curlFetch as runCurlFetch, curlRedirectUrl } from '@/lib/server/curl';

/**
 * StreamTape / StringTape Extractor
 * 
 * StreamTape embeds the video download URL split across two pieces:
 *   1. A partial URL inside a <div id="robotoken"> (or similar hidden element)
 *   2. The remaining fragment inside a nearby <script> block
 * 
 * The final URL is: https://streamtape.com/get_video?id=...&expires=...&ip=...&token=...&stream=1
 * which returns a 302 redirect to the actual MP4 file.
 */

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };
  try {
    return runCurlFetch(url, { headers });
  } catch {
    return '';
  }
}

/**
 * Extracts the direct MP4 URL from a StreamTape embed page.
 * 
 * The page contains a script like:
 *   document.getElementById('robotoken').innerHTML = '...partial_url...';
 *   ...
 *   var something = '...token_fragment...' + '...another_fragment...';
 * 
 * We need to find both pieces and reconstruct the full URL.
 */
export async function extractStreamtape(embedUrl: string): Promise<string | null> {
  try {
    // Normalize URL to /e/ format
    let normalizedUrl = embedUrl;
    if (embedUrl.includes('/v/')) {
      normalizedUrl = embedUrl.replace('/v/', '/e/');
    }
    
    console.log(`[Extractor:StreamTape] Fetching: ${normalizedUrl}`);
    const html = curlFetch(normalizedUrl);
    
    if (!html || html.includes('Video not found') || html.length < 1000) {
      console.log('[Extractor:StreamTape] Empty or not-found response');
      return null;
    }

    // Method 1: Find the innerHTML assignment to robotoken/overlay
    // Pattern: document.getElementById('robotoken').innerHTML = '/get_video?id=...&expires=...&ip=...&token=';
    // Then a second token part is appended via JS
    const innerHtmlMatch = html.match(/innerHTML\s*=\s*["']([^"']*\/get_video\?[^"']*)["']/);
    
    if (innerHtmlMatch) {
      let partialUrl = innerHtmlMatch[1];
      console.log(`[Extractor:StreamTape] Found partial URL: ${partialUrl.substring(0, 60)}...`);

      // Find the token that gets appended — usually right after in the same script
      // Pattern varies: sometimes it's ('token=' + 'XXXXX'), sometimes assigned to a var
      const tokenMatch = html.match(/(?:token|videotoken)\s*=\s*["']([a-zA-Z0-9_-]+)["']/);
      if (tokenMatch) {
        partialUrl += tokenMatch[1];
      }
      
      // Extract the base domain
      const domainMatch = normalizedUrl.match(/https?:\/\/([^\/]+)/);
      const domain = domainMatch ? domainMatch[0] : 'https://streamtape.com';
      
      const fullUrl = `${domain}${partialUrl}&stream=1`;
      console.log(`[Extractor:StreamTape] ✅ Constructed URL: ${fullUrl.substring(0, 80)}...`);
      
      // Follow redirect to get the actual MP4 URL
      try {
        const redirectResult = curlRedirectUrl(fullUrl, {
          headers: {
            'User-Agent': BROWSER_UA,
            'Referer': normalizedUrl,
          },
          maxTimeSeconds: 10,
        });
        
        if (redirectResult && redirectResult.startsWith('http')) {
          console.log(`[Extractor:StreamTape] ✅ Final MP4: ${redirectResult.substring(0, 80)}...`);
          return redirectResult;
        }
      } catch {}
      
      // If redirect didn't work, return the constructed URL anyway
      return fullUrl;
    }

    // Method 2: Try regex for the common obfuscation pattern
    // Some versions split the URL across multiple string concatenations
    const scriptBlocks = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    for (const block of scriptBlocks) {
      // Look for get_video URL fragments
      const getVideoMatch = block.match(/['"]([^'"]*\/get_video\?[^'"]+)['"]/);
      if (getVideoMatch) {
        let videoPath = getVideoMatch[1];
        
        // Try to find any appended token
        const appendMatch = block.match(/\+\s*['"]([a-zA-Z0-9_&=.-]+)['"]/g);
        if (appendMatch) {
          for (const m of appendMatch) {
            const val = m.replace(/[+'"\s]/g, '');
            if (val && !val.includes('//')) {
              videoPath += val;
            }
          }
        }
        
        const domainMatch = normalizedUrl.match(/https?:\/\/([^\/]+)/);
        const domain = domainMatch ? domainMatch[0] : 'https://streamtape.com';
        const fullUrl = videoPath.startsWith('http') ? videoPath : `${domain}${videoPath}`;
        
        console.log(`[Extractor:StreamTape] ✅ Method 2 URL: ${fullUrl.substring(0, 80)}...`);
        return fullUrl;
      }
    }

    console.log('[Extractor:StreamTape] ❌ Could not extract video URL');
    return null;
  } catch (err) {
    console.error('[Extractor:StreamTape] Error:', err);
    return null;
  }
}
