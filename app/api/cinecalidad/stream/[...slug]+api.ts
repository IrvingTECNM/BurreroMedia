import * as cheerio from 'cheerio';
import { extractFilemoon as extractFilemoonNew } from '../../../../lib/extractors/filemoon';
import { curlFetch as runCurlFetch } from '../../../../lib/server/curl';

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const CINECALIDAD_MIRRORS = [
  'https://www.cinecalidad.rs',
  'https://www.cinecalidad.am'
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
};

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch a URL using curl (bypasses Cloudflare TLS fingerprinting).
 * Falls back to global fetch if curl is unavailable.
 */
function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };

  try {
    return runCurlFetch(url, { headers });
  } catch (err) {
    console.error('[curlFetch] Failed for:', url);
    return '';
  }
}

/**
 * Known Cinecalidad online service URL patterns.
 */
function resolveServiceUrl(service: string, data: string): string | null {
  switch (service) {
    case 'OnlineFilemoon':
      return `https://filemoon.sx/e/${data}`;
    case 'OnlineVoe':
      return `https://voe.sx/e/${data}`;
    case 'OnlineDoodstream':
      return `https://dood.li/e/${data}`;
    case 'OnlineStreamwish':
      return `https://streamwish.to/e/${data}`;
    case 'OnlineFilelions':
      return `https://filelions.to/v/${data}`;
    case 'OnlineStreamtape':
      return `https://streamtape.com/e/${data}`;
    case 'OnlineMega':
      return `https://mega.nz/file/${data}`;
    case 'Trailer':
      return `https://www.youtube.com/watch?v=${data}`;
    case 'TurboBit':
      return `https://turbobit.net/${data}.html`;
    case '1fichier':
      return `https://1fichier.com/?${data}`;
    case 'Mega':
      return `https://mega.nz/file/${data}`;
    default:
      return null;
  }
}

interface TMDBInfo {
  title: string;
  year: number | null;
  altTitles: string[]; // additional search terms to try
}

/**
 * Fetch movie title(s) and year from TMDB.
 * Returns the primary title in es-MX, plus alternates (original, es-ES, en).
 */
async function getTitleFromTMDB(tmdbId: number, type: string): Promise<TMDBInfo | null> {
  try {
    if (!TMDB_API_KEY) return null;

    const mainRes = await fetch(`${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`);
    if (!mainRes.ok) return null;
    const main = await mainRes.json();

    const title = main.title || main.name || null;
    if (!title) return null;

    const releaseDate = main.release_date || main.first_air_date || '';
    const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;

    const altTitles: string[] = [];
    if (main.original_title && main.original_title !== title) altTitles.push(main.original_title);
    if (main.original_name && main.original_name !== title) altTitles.push(main.original_name);

    try {
      const altRes = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/alternative_titles?api_key=${TMDB_API_KEY}`);
      if (altRes.ok) {
        const altData = await altRes.json();
        const alts: Array<{iso_3166_1: string, title: string}> = altData.titles || altData.results || [];
        for (const a of alts) {
          if (['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'US'].includes(a.iso_3166_1)) {
            if (a.title && !altTitles.includes(a.title) && a.title !== title) {
              altTitles.push(a.title);
            }
          }
        }
      }
    } catch {}

    return { title, year, altTitles };
  } catch {
    return null;
  }
}

/**
 * Serverless Extractor for Doodstream.
 * Uses curl (OpenSSL TLS) to bypass Cloudflare fingerprinting.
 */
function extractDoodstream(url: string): string {
  const videoIdMatch = url.match(/\/e\/([a-zA-Z0-9]+)/);
  if (!videoIdMatch) return url;
  const videoId = videoIdMatch[1];

  const MIRRORS = ['dood.li', 'dood.wf', 'd0000d.com', 'dood.re', 'dood.so', 'dood.watch', 'dood.pm'];

  for (const mirror of MIRRORS) {
    try {
      const embedUrl = `https://${mirror}/e/${videoId}`;
      console.log(`[Extractor:Dood] Trying ${mirror} via curl...`);

      const html = curlFetch(embedUrl);
      if (!html || html.includes('Just a moment') || html.length < 2000) {
        console.log(`[Extractor:Dood] ${mirror} blocked (${html.length} bytes)`);
        continue;
      }

      const passMatch = html.match(/\/pass_md5\/[^\s'"]+/);
      if (!passMatch) {
        console.log(`[Extractor:Dood] ${mirror} no pass_md5`);
        continue;
      }

      const passUrl = `https://${mirror}${passMatch[0]}`;
      const splitPath = passMatch[0].split('/');
      const token = splitPath[splitPath.length - 1];

      // curl the pass_md5 endpoint with Referer
      const baseVideoUrl = curlFetch(passUrl, { 'Referer': embedUrl });

      if (baseVideoUrl && baseVideoUrl.trim().startsWith('http')) {
        const randomStr = Math.random().toString(36).substring(2, 12);
        const finalUrl = `${baseVideoUrl.trim()}${randomStr}?token=${token}&expiry=${Date.now()}`;
        console.log(`[Extractor:Dood] ✅ Success via ${mirror}!`);
        return finalUrl;
      }

      console.log(`[Extractor:Dood] ${mirror} pass_md5 returned: ${baseVideoUrl.substring(0, 60)}`);
    } catch (err) {
      console.log(`[Extractor:Dood] ${mirror} error:`, err);
      continue;
    }
  }

  console.log('[Extractor:Dood] All mirrors failed');
  return url;
}

/**
 * Wrap a video URL through our /api/proxy endpoint.
 */
function proxyWrap(videoUrl: string, serverOrigin: string, referer?: string): string {
  const b64Url = Buffer.from(videoUrl).toString('base64url');
  let result = `${serverOrigin}/api/proxy?q=${b64Url}`;
  if (referer) {
    const b64Ref = Buffer.from(referer).toString('base64url');
    result += `&r=${b64Ref}`;
  }
  return result;
}

/**
 * Scrape Cinecalidad for streams matching a search query
 */
async function scrapeCinecalidadForStreams(queryStr: string, serverOrigin: string, expectedYear?: number | null, altTitles?: string[]): Promise<any[]> {
  const searchTerms = [queryStr, ...(altTitles || [])].filter(Boolean);
  const allStreams: any[] = [];
  const foundMovieLinks = new Set<string>();

  for (const mirror of CINECALIDAD_MIRRORS) {
    console.log(`[Cinecalidad API] Checking mirror: ${mirror}`);
    
    let bestMovieLink = null;

    for (const term of searchTerms) {
      if (bestMovieLink) break;
      try {
        const searchUrl = `${mirror}/?s=${encodeURIComponent(term)}`;
        console.log(`[Cinecalidad API] Buscando en: ${searchUrl} (Year: ${expectedYear})`);
        
        const searchHtml = curlFetch(searchUrl);
        if (!searchHtml || searchHtml.includes('Just a moment')) {
            console.warn(`[Cinecalidad API] Search blocked or empty for: ${term} on ${mirror}`);
            continue;
        }

        const $ = cheerio.load(searchHtml);
        const results = $('article.item, div.home_post_cont, div.postercnt');
        console.log(`[Cinecalidad API] Encontrados ${results.length} bloques de resultado para: ${term} en ${mirror}`);

        results.each((_i, el) => {
          if (bestMovieLink) return;
          const link = $(el).find('a[href*="/ver-pelicula/"], a[href*="/pelicula/"]').first().attr('href');
          if (!link) return;

          const titleEl = $(el).find('.in_title, h3, h2').first();
          const titleText = titleEl.text().trim() || $(el).find('img').attr('alt') || '';
          
          // Year extraction: check parentheses first, then separate tags (for .am)
          const yearMatch = (titleText + ' ' + $(el).text()).match(/(\d{4})/);
          const ry = yearMatch ? parseInt(yearMatch[1], 10) : null;

          if (expectedYear && ry) {
            if (Math.abs(ry - expectedYear) <= 1) {
               console.log(`[Cinecalidad API] ✅ Valid match: ${titleText} (Expected ${expectedYear}, Got ${ry}) en ${mirror}`);
               bestMovieLink = link;
            } else {
               // Don't log as mismatch if it's clearly a different movie, keep searching
            }
          } else if (link) {
            console.log(`[Cinecalidad API] ⚠️ No year validation possible for: ${titleText}, taking first.`);
            bestMovieLink = link;
          }
        });
      } catch (e) {
        console.error('[Cinecalidad API] Error searching term', term, e);
      }
    }

    if (bestMovieLink && !foundMovieLinks.has(bestMovieLink)) {
      foundMovieLinks.add(bestMovieLink);
      console.log(`[Cinecalidad API] Entrando a película en ${mirror}:`, bestMovieLink);

      try {
        const movieHtml = curlFetch(bestMovieLink);
        if (movieHtml) {
          const $movie = cheerio.load(movieHtml);
          
          // Extract Audio languages
          let movieAudio = 'Latino';
          const spans = $movie('span').map((i, el) => $movie(el).text().trim()).get();
          for (const spanText of spans) {
             if (spanText.toLowerCase().includes('audio:')) {
                 const cleaned = spanText.replace(/audio:/i, '').trim();
                 if (cleaned) movieAudio = cleaned;
                 break;
             }
          }

          const extractionPromises: Promise<void>[] = [];
          
          // Extract online streaming links (Mirror .rs style + Mirror .am DooPlay style)
          const onlineLinks = $movie('a.onlinelink, li[data-option], li[data-url]');
          console.log(`[Cinecalidad API] Checking ${onlineLinks.length} potential streaming nodes on ${mirror}`);

          onlineLinks.each((_i, el) => {
            const service = $movie(el).attr('service') || $movie(el).text().trim() || 'Video';
            const data = $movie(el).attr('data') || $movie(el).attr('data-option') || $movie(el).attr('data-url') || '';
            const label = $movie(el).text().trim();
            
            if (service === 'Trailer' || label === 'Trailer') return;
            
            let resolvedUrl = resolveServiceUrl(service, data);
            
            // If data itself is already a full URL (common in .am data-option)
            if (!resolvedUrl && data && data.startsWith('http')) {
              resolvedUrl = data;
            }

            if (resolvedUrl) {
              const stream: any = {
                name: `Cinecalidad (${new URL(mirror).hostname.split('.')[1]})`,
                description: `🎬 ${label} (${movieAudio} HD)`,
                url: resolvedUrl,
                isDownload: false,
                behaviorHints: { notWebReady: true, isDirect: false },
              };
              allStreams.push(stream);

              // Extraction for Filemoon/Doodstream/Voe/Vimeos/Goodstream...
              const lowerUrl = resolvedUrl.toLowerCase();
              if (lowerUrl.includes('filemoon')) {
                  extractionPromises.push(
                     extractFilemoonNew(resolvedUrl, mirror).then(m3u8 => {
                        if (m3u8) {
                          stream.url = proxyWrap(m3u8, serverOrigin, resolvedUrl);
                          stream.description += ' ⚡';
                          stream.behaviorHints.isDirect = true;
                          stream.behaviorHints.notWebReady = false;
                        }
                     }).catch(()=>{})
                  );
              } else if (lowerUrl.match(/(vimeos|goodstream|hlswish|streamwish|filelions)/)) {
                  extractionPromises.push(
                     Promise.resolve().then(async () => {
                         const { extractGenericPacked } = await import('../../../../lib/extractors/packed');
                         const m3u8 = await extractGenericPacked(resolvedUrl);
                         if (m3u8) {
                             stream.url = proxyWrap(m3u8, serverOrigin, resolvedUrl);
                             stream.description += ' ⚡';
                             stream.behaviorHints.isDirect = true;
                             stream.behaviorHints.notWebReady = false;
                         }
                         // If extraction fails, keep as indirect embed (open in browser)
                     }).catch(()=>{})
                  );
              } else if (lowerUrl.includes('voe.sx')) {
                  // Voe embed URLs expire quickly (session-bound) — open in external browser
                  stream.description = stream.description.replace('🎬', '🌐');
                  stream.behaviorHints.notWebReady = false; // Allow web browser open
                  console.log(`[Cinecalidad API] Voe link kept as external browser link`);
              } else if (lowerUrl.includes('dood')) {
                   extractionPromises.push(
                      Promise.resolve().then(() => {
                         const extracted = extractDoodstream(resolvedUrl);
                         if (extracted !== resolvedUrl) {
                           stream.url = proxyWrap(extracted, serverOrigin, resolvedUrl);
                           stream.description += ' ⚡';
                           stream.behaviorHints.isDirect = true;
                           stream.behaviorHints.notWebReady = false;
                         }
                      }).catch(()=>{})
                   );
              }
            }
          });

          // Download links as fallback
          $movie('a.link, li[data-download]').not('.onlinelink').each((_i, el) => {
            const service = $movie(el).attr('service') || '';
            const data = $movie(el).attr('data') || $movie(el).attr('data-download') || '';
            const href = $movie(el).attr('href') || '';
            const label = $movie(el).text().trim();
            
            if (service === 'Trailer' || service === 'Trailer2' || label === 'Trailer') return;
            
            if (href && href.startsWith('http') && !href.startsWith('javascript')) {
              allStreams.push({
                name: `Cinecalidad (${new URL(mirror).hostname.split('.')[1]})`,
                description: `📥 ${label} (Descarga)`,
                url: href,
                isDownload: true,
                behaviorHints: { notWebReady: true },
              });
              return;
            }
            
            if (data) {
              const resolvedUrl = resolveServiceUrl(service, data);
              if (resolvedUrl) {
                allStreams.push({
                  name: `Cinecalidad (${new URL(mirror).hostname.split('.')[1]})`,
                  description: `📥 ${label} (Descarga)`,
                  url: resolvedUrl,
                  isDownload: true,
                  behaviorHints: { notWebReady: true },
                });
              } else if (data.startsWith('http')) {
                allStreams.push({
                  name: `Cinecalidad (${new URL(mirror).hostname.split('.')[1]})`,
                  description: `📥 ${label} (Descarga)`,
                  url: data,
                  isDownload: true,
                  behaviorHints: { notWebReady: true },
                });
              }
            }
          });

          await Promise.all(extractionPromises);
        }
      } catch (error) {
        console.error(`[Cinecalidad API] Error processing mirror ${mirror}:`, error);
      }
    }
  }

  // Final deduplication by URL and sort
  const uniqueStreams = Array.from(new Map(allStreams.map(s => [s.url, s])).values());
  uniqueStreams.sort((a, b) => (b.behaviorHints?.isDirect ? 1 : 0) - (a.behaviorHints?.isDirect ? 1 : 0));

  console.log(`[Cinecalidad API] Encontrados ${uniqueStreams.length} streams únicos en total.`);
  return uniqueStreams;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const serverOrigin = url.origin;
    const allSegments = url.pathname.split('/').filter(Boolean);

    const streamIndex = allSegments.indexOf('stream');
    const segments = streamIndex >= 0 
      ? allSegments.slice(streamIndex + 1) 
      : allSegments.slice(-2);

    if (segments.length < 2) {
      return new Response(
        JSON.stringify({ streams: [], error: 'Expected /api/cinecalidad/stream/{type}/{id}' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const type = segments[0];
    let id = segments[1].replace('.json', '');
    if (id.startsWith('tmdb:')) {
      id = id.substring(5);
    }
    let searchQuery = id;
    let expectedYear: number | null = null;
    let altTitles: string[] = [];

    if (/^\d+$/.test(id)) {
      const info = await getTitleFromTMDB(parseInt(id, 10), type);
      if (info) {
        searchQuery = info.title;
        expectedYear = info.year;
        altTitles = info.altTitles;
        console.log(`[Cinecalidad API] TMDB info: "${info.title}" (${info.year}), alts: [${info.altTitles.slice(0,3).join(', ')}]`);
      }
    }

    console.log(`[Cinecalidad API] Type: ${type}, ID: ${id}, Query: "${searchQuery}"`);

    let streams: any[] = [];
    if (type === 'movie') {
      streams = await scrapeCinecalidadForStreams(searchQuery, serverOrigin, expectedYear, altTitles);
    }

    return new Response(
      JSON.stringify({ streams }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[Cinecalidad API] Fatal error:', error);
    return new Response(
      JSON.stringify({ streams: [], error: error?.message || 'Internal error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
