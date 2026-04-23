import * as cheerio from 'cheerio';
import { execSync } from 'child_process';
import { extractFilemoon as extractFilemoonNew } from '../../../../lib/extractors/filemoon';

const TMDB_API_KEY = 'ded2a315221e6d1d975e15f43377321d';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const CUEVANA_BASE_URL = 'https://ww9.cuevana3.to';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch a URL using curl (bypasses Cloudflare TLS fingerprinting)
 */
function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
 * Extract Doodstream direct MP4 URL via curl
 */
function extractDoodstream(embedUrl: string): string | null {
  const videoIdMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/);
  if (!videoIdMatch) return null;
  const videoId = videoIdMatch[1];

  // Try doodstream.com first (what Cuevana uses), then mirrors
  const mirrors = ['doodstream.com', 'dood.li', 'dood.wf', 'd0000d.com', 'dood.re', 'dood.pm'];
  
  for (const mirror of mirrors) {
    const url = `https://${mirror}/e/${videoId}`;
    const html = curlFetch(url);
    if (!html || html.includes('Just a moment') || html.length < 2000) continue;

    const passMatch = html.match(/\/pass_md5\/[^\s'"]+/);
    if (!passMatch) continue;

    const passUrl = `https://${mirror}${passMatch[0]}`;
    const token = passMatch[0].split('/').pop() || '';

    const baseVideoUrl = curlFetch(passUrl, { 'Referer': url });
    if (baseVideoUrl && baseVideoUrl.trim().startsWith('http')) {
      const rand = Math.random().toString(36).substring(2, 12);
      return `${baseVideoUrl.trim()}${rand}?token=${token}&expiry=${Date.now()}`;
    }
  }
  return null;
}

/**
 * Extract raw .m3u8 URI from Filemoon iframe (decodes standard packer)
 */
async function extractFilemoon(url: string): Promise<string | null> {
  return await extractFilemoonNew(url);
}

interface TMDBInfo {
  title: string;
  year: number | null;
  altTitles: string[]; // additional search terms to try
}

/**
 * Fetch movie title(s) and year from TMDB.
 * Returns the primary title in es-MX, plus alternates (original, es-ES, en).
 * Having multiple titles lets us try different search terms against Cuevana.
 */
async function getTitleFromTMDB(tmdbId: number, type: string): Promise<TMDBInfo | null> {
  try {
    // Fetch main info (es-MX)
    const mainRes = await fetch(`${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`);
    if (!mainRes.ok) return null;
    const main = await mainRes.json();

    const title = main.title || main.name || null;
    if (!title) return null;

    const releaseDate = main.release_date || main.first_air_date || '';
    const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;

    // Build alt title list: original + Spanish Spain
    const altTitles: string[] = [];
    if (main.original_title && main.original_title !== title) altTitles.push(main.original_title);
    if (main.original_name && main.original_name !== title) altTitles.push(main.original_name);

    // Also fetch alternate titles from TMDB for this movie
    try {
      const altRes = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/alternative_titles?api_key=${TMDB_API_KEY}`);
      if (altRes.ok) {
        const altData = await altRes.json();
        const alts: Array<{iso_3166_1: string, title: string}> = altData.titles || altData.results || [];
        // Prioritize Spanish variants
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
 * Build a proxy-wrapped URL
 */
function proxyWrap(videoUrl: string, serverOrigin: string, referer?: string): string {
  // Use Base64URL to prevent query parameter truncation by intermediate routers
  const b64Url = Buffer.from(videoUrl).toString('base64url');
  let result = `${serverOrigin}/api/proxy?q=${b64Url}`;
  if (referer) {
    const b64Ref = Buffer.from(referer).toString('base64url');
    result += `&r=${b64Ref}`;
  }
  return result;
}

/**
 * Detect language group from the TPlayerNv list structure
 * Cuevana3 uses OptE{group}{num} pattern:
 *   OptE1x = Español Latino, OptE2x = Subtitulado, OptE3x = Español
 */
function getLangLabel(optId: string): string {
  if (optId.startsWith('OptE1')) return 'Latino';
  if (optId.startsWith('OptE2')) return 'Subtitulado';
  if (optId.startsWith('OptE3')) return 'Español';
  return 'Desconocido';
}

/**
 * Get server name from known domains
 */
function getServerName(url: string): string {
  if (url.includes('doodstream')) return 'Doodstream';
  if (url.includes('dood.')) return 'Doodstream';
  if (url.includes('voe.sx')) return 'Voe';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('filemoon')) return 'Filemoon';
  if (url.includes('streamwish')) return 'Streamwish';
  if (url.includes('vidhide')) return 'Vidhide';
  if (url.includes('waaw.to')) return 'Netu';
  return 'Desconocido';
}

/**
 * Scrape results from cue.cuevana3.nu using its JSON API
 */
async function scrapeCuevanaNu(queryStr: string, serverOrigin: string, expectedYear?: number | null): Promise<any[]> {
  try {
    const cleanQuery = queryStr.replace(/[&:!?()]/g, ' ').replace(/\s+/g, ' ').trim().split(' ')[0];
    const apiUrl = `https://cue.cuevana3.nu/wp-json/cuevana/v1/search?q=${encodeURIComponent(cleanQuery)}`;
    console.log('[Cuevana API] Searching cuevana.nu API:', cleanQuery);

    const jsonStr = curlFetch(apiUrl, { 'Accept': 'application/json' });
    if (!jsonStr || !jsonStr.trim().startsWith('{')) return [];

    const data = JSON.parse(jsonStr);
    const results: any[] = data.data || [];
    if (results.length === 0) return [];

    // Find best match by year validation
    const match = pickBestResult(results, expectedYear);
    if (!match) {
      console.log('[Cuevana API] No year-validated match found on cuevana.nu');
      return [];
    }

    const movieUrl = match.link.startsWith('http') ? match.link : `https://cue.cuevana3.nu${match.link}`;
    console.log('[Cuevana API] Found movie on cuevana.nu:', movieUrl);

    const movieHtml = curlFetch(movieUrl);
    if (!movieHtml) return [];

    return await processServerPage(movieHtml, serverOrigin, movieUrl);
  } catch (error) {
    console.error('[Cuevana API] cuevana.nu error:', error);
    return [];
  }
}

/**
 * Pick the best search result by validating the year.
 * Prevents false positives like "Deadpool & Wolverine" when searching for "Deadpool".
 */
function pickBestResult(results: any[], expectedYear?: number | null): any | null {
  if (!results || results.length === 0) return null;

  // If we have no year to validate against, just take the first
  if (!expectedYear) return results[0];

  for (const result of results) {
    // Results may have a year in the title slug or a 'year'/'date' field
    const resultYear =
      result.year ??
      result.release_date ??
      (result.link?.match(/(\d{4})/))?.[1] ??
      null;

    if (resultYear) {
      const ry = parseInt(String(resultYear), 10);
      if (Math.abs(ry - expectedYear) <= 1) {
        console.log(`[Cuevana API] Year match: expected ${expectedYear}, got ${ry}`);
        return result;
      }
    }
  }

  // No year match found — don't return a potentially wrong result
  console.log(`[Cuevana API] No year match (expected ${expectedYear}) among ${results.length} results`);
  return null;
}

/**
 * Shared logic to process any Cuevana server page.
 * Extraction Promises are fired immediately upon URL discovery
 * so parsing and network calls run in true parallel.
 */
async function processServerPage(html: string, serverOrigin: string, referer?: string): Promise<any[]> {
  const $movie = cheerio.load(html);
  const streams: any[] = [];
  const serverMap: Record<string, string> = {};

  // Map server names from UI
  $movie('.TPlayerNv li').each(function() {
    const dbId = $movie(this).attr('data-tplayernv') || $movie(this).attr('data-tplayer') || '';
    let name = $movie(this).text().trim();
    if (name.includes('-')) {
      const parts = name.split('-');
      if (parts.length > 1) name = parts[1].trim(); 
    }
    if (dbId && name) serverMap[dbId] = name;
  });

  // Collect extraction promises as we parse — don't wait until all are found
  const extractionPromises: Promise<void>[] = [];

  const containers = $movie('.TPlayerTb').toArray();
  for (const container of containers) {
    const optId = $movie(container).attr('id') || '';
    const iframe = $movie(container).find('iframe');
    const src = iframe.attr('data-src') || iframe.attr('src') || '';

    if (!src || !src.startsWith('http')) continue;

    const lang = getLangLabel(optId);
    const server = serverMap[optId] || getServerName(src);
    const serverLower = server.toLowerCase();
    let finalUrl = src;

    // Base64 decode for showEmbed
    if (src.includes('showEmbed=')) {
      try {
        const urlObj = new URL(src);
        const b64 = urlObj.searchParams.get('showEmbed');
        if (b64) {
          const decoded = Buffer.from(b64, 'base64').toString('utf8');
          if (decoded.startsWith('http')) finalUrl = decoded;
        }
      } catch {}
    }

    const isFilemoon = serverLower.includes('filemoon') || serverLower.includes('fmoon') || finalUrl.includes('filemoon.sx') || finalUrl.includes('byse');
    const isDoodstream = serverLower.includes('doodstream') || serverLower.includes('dood.');
    const provider = isFilemoon ? 'filemoon' : (isDoodstream ? 'doodstream' : undefined);

    const stream: any = {
      name: 'Cuevana3',
      description: `🎬 ${server} (${lang} HD)`,
      url: finalUrl,
      provider,
      behaviorHints: { notWebReady: true, isDirect: false },
    };
    streams.push(stream);

    // 🚀 Fire extraction immediately — don't wait for all containers to be parsed
    if (provider === 'filemoon') {
      extractionPromises.push(
        extractFilemoon(stream.url, referer).then(fmUrl => {
          if (fmUrl) {
            stream.url = proxyWrap(fmUrl, serverOrigin, stream.url);
            stream.description += ' ⚡';
            stream.behaviorHints.isDirect = true;
            stream.behaviorHints.notWebReady = false;
          }
        }).catch(() => {})
      );
    } else if (provider === 'doodstream') {
      extractionPromises.push(
        Promise.resolve().then(() => {
          const extracted = extractDoodstream(stream.url);
          if (extracted) {
            stream.url = proxyWrap(extracted, serverOrigin);
            stream.description += ' ⚡';
            stream.behaviorHints.isDirect = true;
            stream.behaviorHints.notWebReady = false;
          }
        }).catch(() => {})
      );
    } else if (serverLower.match(/(vimeos|goodstream|hlswish|streamwish|filelions|netu)/)) {
      extractionPromises.push(
          Promise.resolve().then(async () => {
              const { extractGenericPacked } = await import('../../../../lib/extractors/packed');
              const extracted = await extractGenericPacked(stream.url);
              if (extracted) {
                 stream.url = proxyWrap(extracted, serverOrigin, stream.url);
                 stream.description += ' ⚡';
                 stream.behaviorHints.isDirect = true;
                 stream.behaviorHints.notWebReady = false;
              }
          }).catch(()=>{})
      );
    }
  }

  // Wait for all in-flight extractions to finish
  await Promise.all(extractionPromises);

  return streams;
}


/**
 * Scrape Cuevana3 for streams with Multi-Mirror Fallback.
 * Tries multiple title variants (es-MX, original, alternates) to handle
 * localized titles like Moana/Vaiana or Project Hail Mary/Proyecto Fin del Mundo.
 */
async function scrapeCuevana(queryStr: string, serverOrigin: string, expectedYear?: number | null, altTitles?: string[]): Promise<any[]> {
  const mirrors = [
    { type: 'classic', url: 'https://ww9.cuevana3.to' },
    { type: 'classic', url: 'https://www.cuevana3.to' },
    { type: 'api', url: 'https://cue.cuevana3.nu' }
  ];

  // Build the full list of search terms to try: primary title first, then alternates
  const searchTerms = [queryStr, ...(altTitles || [])].filter(Boolean);

  for (const mirror of mirrors) {
    // Try each title variant for this mirror
    for (const term of searchTerms) {
      try {
        console.log(`[Cuevana API] Mirror: ${mirror.url} | Query: "${term}"`);

        if (mirror.type === 'api') {
          const results = await scrapeCuevanaNu(term, serverOrigin, expectedYear);
          if (results.length > 0) {
            results.sort((a, b) => {
              if (a.behaviorHints.isDirect !== b.behaviorHints.isDirect) {
                return b.behaviorHints.isDirect ? -1 : 1;
              }
              const langOrder = (d: string) => d.includes('Latino') ? 0 : d.includes('Subtitulado') ? 1 : 2;
              return langOrder(a.description) - langOrder(b.description);
            });
            return results;
          }
          continue;
        }

        // Classic scraping logic
        const cleanQuery = term.replace(/[&:!?()]/g, ' ').replace(/\s+/g, ' ').trim().split(' ')[0];
        const searchUrl = `${mirror.url}/?s=${encodeURIComponent(cleanQuery)}`;
        const searchHtml = curlFetch(searchUrl);
        if (!searchHtml) continue;

        const $ = cheerio.load(searchHtml);
        let bestLink: string | null = null;

        // Validate each result by year before accepting it
        $('.TPost').each(function() {
          if (bestLink) return; // already found one
          const link = $(this).find('a').first().attr('href') || '';
          if (link.includes('/serie/')) return;

          if (expectedYear) {
            // Try to find year from the result card (e.g. in a <span class="Year">) 
            const cardYear = parseInt($(this).find('.Year').text().trim(), 10);
            if (cardYear && Math.abs(cardYear - expectedYear) > 1) {
              console.log(`[Cuevana API] Skipping result (year ${cardYear} ≠ ${expectedYear}): ${link}`);
              return; // skip this result
            }
          }

          if (link) bestLink = link;
        });

        if (!bestLink) continue;

        const movieUrl = (bestLink as string).startsWith('http') ? bestLink as string : `${mirror.url}${bestLink}`;
        const movieHtml = curlFetch(movieUrl);
        if (!movieHtml) continue;

        const results = await processServerPage(movieHtml, serverOrigin, movieUrl);
        if (results.length > 0) {
          results.sort((a, b) => {
            if (a.behaviorHints.isDirect !== b.behaviorHints.isDirect) {
              return b.behaviorHints.isDirect ? -1 : 1;
            }
            const langOrder = (d: string) => d.includes('Latino') ? 0 : d.includes('Subtitulado') ? 1 : 2;
            return langOrder(a.description) - langOrder(b.description);
          });
          return results;
        }

      } catch (error) {
        console.error(`[Cuevana API] Mirror ${mirror.url} | Term "${term}" failed:`, error);
      }
    }
  }

  return [];
}

/**
 * GET /api/cuevana/stream/movie/533535
 */
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
        JSON.stringify({ streams: [], error: 'Expected /api/cuevana/stream/{type}/{id}' }),
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
        console.log(`[Cuevana API] TMDB info: "${info.title}" (${info.year}), alts: [${info.altTitles.slice(0, 3).join(', ')}]`);
      }
    }

    console.log(`[Cuevana API] Type: ${type}, ID: ${id}, Query: "${searchQuery}"`);

    let streams: any[] = [];
    if (type === 'movie') {
      streams = await scrapeCuevana(searchQuery, serverOrigin, expectedYear, altTitles);
    }

    return new Response(
      JSON.stringify({ streams }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[Cuevana API] Fatal error:', error);
    return new Response(
      JSON.stringify({ streams: [], error: error?.message || 'Internal error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
