/**
 * Video Proxy API Route
 * 
 * Streams video bytes from an external URL through our own server,
 * adding required headers (Referer, etc.) that browsers block due to CORS.
 * 
 * Usage: GET /api/proxy?url=<encoded_video_url>
 * 
 * Supports HTTP Range requests for seeking in video players.
 */

const PROXY_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

interface HlsVariant {
  infoLine: string;
  uriLine: string;
  index: number;
  score: number;
}

function getHlsVariantScore(infoLine: string): number {
  const resolutionMatch = infoLine.match(/RESOLUTION=(\d+)x(\d+)/i);
  if (resolutionMatch) {
    const width = Number(resolutionMatch[1]);
    const height = Number(resolutionMatch[2]);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return width * height;
    }
  }

  const bandwidthMatch = infoLine.match(/BANDWIDTH=(\d+)/i);
  if (bandwidthMatch) {
    const bandwidth = Number(bandwidthMatch[1]);
    if (Number.isFinite(bandwidth)) {
      return bandwidth;
    }
  }

  return 0;
}

function pickHighestHlsVariant(lines: string[]): HlsVariant | null {
  const variants: HlsVariant[] = [];

  for (let i = 0; i < lines.length; i++) {
    const infoLine = lines[i].trim();
    if (!infoLine.startsWith('#EXT-X-STREAM-INF')) continue;

    const uriLine = lines[i + 1]?.trim();
    if (!uriLine || uriLine.startsWith('#')) continue;

    variants.push({
      infoLine: lines[i],
      uriLine,
      index: i,
      score: getHlsVariantScore(infoLine),
    });
  }

  if (variants.length === 0) return null;

  return variants.sort((a, b) => b.score - a.score)[0];
}

export async function GET(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
  };

  try {
    const reqUrl = new URL(request.url);
    const b64Url = reqUrl.searchParams.get('q');
    const b64Ref = reqUrl.searchParams.get('r');
    
    if (!b64Url) {
      return new Response(JSON.stringify({ error: 'Missing ?q= parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const videoUrl = Buffer.from(b64Url, 'base64url').toString();
    const customReferer = b64Ref ? Buffer.from(b64Ref, 'base64url').toString() : null;
    const range = request.headers.get('range');

    // Skip verbose logging for individual video segments (.ts/.mp4) to prevent console spam
    if (videoUrl.includes('.m3u8')) {
      console.log(`[Proxy] Streaming [Len: ${videoUrl.length}]:`, videoUrl.substring(0, 80) + '...');
    }

    // Build outgoing headers with required Referer
    const outHeaders: Record<string, string> = { 
      ...PROXY_HEADERS,
      'Accept-Encoding': 'identity', // Force raw bytes, speeds up Doodstream MP4
    };

    if (range) {
      outHeaders['Range'] = range;
    }

    // Use refers
    if (customReferer) {
      outHeaders['Referer'] = customReferer;
      try {
        const refUrl = new URL(customReferer);
        outHeaders['Origin'] = refUrl.origin;
      } catch {}
    } else {
      try {
        const videoDomain = new URL(videoUrl);
        outHeaders['Referer'] = videoDomain.origin + '/';
      } catch {}
    }

    if (videoUrl.includes('.m3u8')) {
      console.log('[Proxy] Headers:', JSON.stringify(outHeaders));
    }

    // NOTE: We intentionally do NOT pass request.signal here.
    // HLS players cancel connections mid-stream (normal behavior) and we don't
    // want that to abort the upstream fetch and throw 'Premature close'.
    const videoRes = await fetch(videoUrl, {
      headers: outHeaders,
      redirect: 'follow',
    });

    const status = videoRes.status;
    const contentType = videoRes.headers.get('Content-Type') || '';
    
    const isM3U8Response = contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL');
    if (videoUrl.includes('.m3u8') || isM3U8Response) {
      console.log(`[Proxy] Upstream Status: ${status}, Content-Type: ${contentType}`);
    }

    if (!videoRes.ok && status !== 206) {
      return new Response(JSON.stringify({ error: `Upstream returned ${status}` }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      });
    }

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=3600', // Allow brief caching of segments
    };
    
    if (contentType) responseHeaders['Content-Type'] = contentType;
    
    // Check if it's an HLS manifest that needs rewriting
    const isM3U8 = videoUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL');

    if (isM3U8) {
      console.log('[Proxy] Rewriting M3U8 manifest...');
      const manifest = await videoRes.text();
      const baseDir = videoUrl.substring(0, videoUrl.lastIndexOf('/') + 1);
      const serverOrigin = new URL(request.url).origin;

      // Efficient line-by-line rewriting
      const lines = manifest.split(/\r?\n/);
      const highestVariant = pickHighestHlsVariant(lines);
      if (highestVariant) {
        console.log('[Proxy] Forcing highest HLS variant:', highestVariant.infoLine.trim());
      }

      const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#EXT-X-STREAM-INF')) return line;

          if (trimmed.startsWith('#')) {
              // Handle URI attributes in tags (e.g. #EXT-X-KEY:URI="...")
              return line.replace(/URI="([^"]+)"/g, (match, url) => {
                  let absoluteUrl = url;
                  if (!url.startsWith('http')) {
                      try { absoluteUrl = new URL(url, baseDir).href; } catch { absoluteUrl = baseDir + url; }
                  }
                  let wrapped = `${serverOrigin}/api/proxy?q=${Buffer.from(absoluteUrl).toString('base64url')}`;
                  if (customReferer) wrapped += `&r=${Buffer.from(customReferer).toString('base64url')}`;
                  return `URI="${wrapped}"`;
              });
          }
          
          // Handle plain URLs or relative paths
          let absoluteUrl = trimmed;
          if (!trimmed.startsWith('http')) {
              try { absoluteUrl = new URL(trimmed, baseDir).href; } catch { absoluteUrl = baseDir + trimmed; }
          }
          
          let wrapped = `${serverOrigin}/api/proxy?q=${Buffer.from(absoluteUrl).toString('base64url')}`;
          if (customReferer) wrapped += `&r=${Buffer.from(customReferer).toString('base64url')}`;
          return wrapped;
      });

      const finalLines = highestVariant
        ? [
            '#EXTM3U',
            ...rewrittenLines.filter((line) => {
              const trimmed = line.trim();
              return (
                trimmed.startsWith('#EXT-X-VERSION') ||
                trimmed.startsWith('#EXT-X-INDEPENDENT-SEGMENTS') ||
                trimmed.startsWith('#EXT-X-MEDIA:')
              );
            }),
            highestVariant.infoLine,
            rewrittenLines[highestVariant.index + 1],
          ]
        : rewrittenLines;

      const rewritten = finalLines.join('\n');
      responseHeaders['Content-Length'] = Buffer.byteLength(rewritten).toString();

      return new Response(rewritten, {
          status: 200,
          headers: responseHeaders,
      });
    }

    // For non-M3U8 files, preserve range metadata so video players can seek.
    for (const headerName of ['Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const headerValue = videoRes.headers.get(headerName);
      if (headerValue) responseHeaders[headerName] = headerValue;
    }

    return new Response(videoRes.body, {
      status: status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    // 'Premature close' and 'AbortError' are normal — HLS players cancel
    // segment requests routinely. Don't log as errors, just ignore.
    const msg = error?.message || '';
    if (msg.includes('Premature close') || error?.name === 'AbortError' || msg.includes('aborted')) {
      return new Response(null, { status: 499 }); // 499 = Client Closed Request
    }
    console.error('[Proxy] Error:', error);
    return new Response(JSON.stringify({ error: msg || 'Proxy error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
    },
  });
}
