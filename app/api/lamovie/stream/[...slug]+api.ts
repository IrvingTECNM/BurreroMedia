/**
 * La.Movie Stream Scraper API
 *
 * Scrapes la.movie for both movies and series episodes.
 *
 * Flow:
 *  1. Resolve TMDB ID → title + year via TMDB API
 *  2. Search la.movie search API for the movie or episode
 *  3. Get the post _id and call the /player endpoint to get embeds
 *  4. Extract HLS/M3U8 URLs from embed pages (vimeos, goodstream, hlswish, etc.)
 *  5. Proxy the M3U8 through /api/proxy for CORS-safe playback
 */
import { curlFetch as runCurlFetch } from '../../../../lib/server/curl';

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const LAMOVIE_BASE = 'https://la.movie';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };

  try {
    return runCurlFetch(url, { headers, maxTimeSeconds: 20 });
  } catch (err) {
    console.error('[la.movie API] curlFetch failed for:', url);
    return '';
  }
}

// ─── TMDB Helpers ────────────────────────────────────────────────────────

interface TMDBInfo {
  title: string;
  year: number | null;
  altTitles: string[];
}

async function getTitleFromTMDB(tmdbId: number, type: string): Promise<TMDBInfo | null> {
  try {
    if (!TMDB_API_KEY) return null;

    const endpoint = type === 'series' ? 'tv' : 'movie';
    const mainRes = await fetch(`${TMDB_BASE}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`);
    if (!mainRes.ok) return null;
    const main = await mainRes.json();

    const title = main.title || main.name || null;
    if (!title) return null;

    const releaseDate = main.release_date || main.first_air_date || '';
    const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;

    const altTitles: string[] = [];
    if (main.original_title && main.original_title !== title) altTitles.push(main.original_title);
    if (main.original_name && main.original_name !== title) altTitles.push(main.original_name);

    return { title, year, altTitles };
  } catch {
    return null;
  }
}

// ─── Proxy Wrapping ──────────────────────────────────────────────────────

function proxyWrap(videoUrl: string, serverOrigin: string, referer?: string): string {
  const b64Url = Buffer.from(videoUrl).toString('base64url');
  let result = `${serverOrigin}/api/proxy?q=${b64Url}`;
  if (referer) {
    const b64Ref = Buffer.from(referer).toString('base64url');
    result += `&r=${b64Ref}`;
  }
  return result;
}

// ─── La.Movie Search ─────────────────────────────────────────────────────

interface LaMoviePost {
  _id: number;
  title: string;
  slug: string;
  type: string; // 'movies' | 'episodes' | 'seasons' | 'collections'
  release_date?: string;
  original_title?: string;
  quality?: number[] | string[];
  lang?: number[];
}

async function searchLaMovie(
  query: string,
  postType: string,
  expectedYear?: number | null,
): Promise<LaMoviePost | null> {
  const cleanQuery = query.replace(/[&:!?()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanQuery.length < 2) return null;

  const apiUrl = `${LAMOVIE_BASE}/wp-api/v1/search?q=${encodeURIComponent(cleanQuery)}&page=1&postType=${postType}&postsPerPage=10`;
  console.log(`[la.movie API] Search: "${cleanQuery}" (type=${postType})`);

  const jsonStr = curlFetch(apiUrl);
  if (!jsonStr || !jsonStr.trim().startsWith('{')) return null;

  try {
    const data = JSON.parse(jsonStr);
    if (data.error || !data.data?.posts) return null;

    const posts: LaMoviePost[] = data.data.posts;
    if (posts.length === 0) return null;

    // For movies, try year matching
    if (expectedYear) {
      for (const post of posts) {
        const releaseYear = post.release_date ? parseInt(post.release_date.substring(0, 4), 10) : null;
        if (releaseYear && Math.abs(releaseYear - expectedYear) <= 1) {
          console.log(`[la.movie API] ✅ Year match: "${post.title}" (${releaseYear})`);
          return post;
        }
      }
    }

    // Fallback: return first result
    console.log(`[la.movie API] Using first result: "${posts[0].title}"`);
    return posts[0];
  } catch (e) {
    console.error('[la.movie API] Search parse error:', e);
    return null;
  }
}

/**
 * Search for a specific episode by searching with JUST the show name,
 * then filtering the results for the matching season/episode.
 *
 * La.Movie's search API does NOT handle complex queries like
 * "Euphoria temporada 1 episodio 1" — it returns empty.
 * Instead we search "Euphoria" with postType=episodes and postsPerPage=50,
 * then iterate through all returned episodes to find S{season}E{episode}.
 *
 * La.Movie titles episodes as "{Show}: Temporada {S} Episodio {E}"
 */
async function searchLaMovieEpisode(
  showTitle: string,
  season: number,
  episode: number,
  altTitles: string[],
): Promise<LaMoviePost | null> {
  const searchTerms = [showTitle, ...altTitles].filter(Boolean);

  for (const term of searchTerms) {
    const cleanTerm = term.replace(/[&:!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanTerm.length < 2) continue;

    // Search with just the show name to get all episodes
    const apiUrl = `${LAMOVIE_BASE}/wp-api/v1/search?q=${encodeURIComponent(cleanTerm)}&page=1&postType=episodes&postsPerPage=50`;
    console.log(`[la.movie API] Episode search: "${cleanTerm}" (looking for S${season}E${episode})`);

    const jsonStr = curlFetch(apiUrl);
    if (!jsonStr || !jsonStr.trim().startsWith('{')) continue;

    try {
      const data = JSON.parse(jsonStr);
      if (data.error || !data.data?.posts) continue;

      const posts: LaMoviePost[] = data.data.posts;
      if (posts.length === 0) continue;

      console.log(`[la.movie API] Got ${posts.length} episodes for "${cleanTerm}"`);

      // Filter for the exact season and episode
      for (const post of posts) {
        if (post.type !== 'episodes') continue;

        const titleLower = post.title.toLowerCase();
        const seasonMatch = titleLower.match(/temporada\s+(\d+)/);
        const episodeMatch = titleLower.match(/episodio\s+(\d+)/);

        if (seasonMatch && episodeMatch) {
          const foundSeason = parseInt(seasonMatch[1], 10);
          const foundEpisode = parseInt(episodeMatch[1], 10);
          if (foundSeason === season && foundEpisode === episode) {
            console.log(`[la.movie API] ✅ Episode match: "${post.title}" (id=${post._id})`);
            return post;
          }
        }
      }

      console.log(`[la.movie API] ⚠️ S${season}E${episode} not found among ${posts.length} episodes for "${cleanTerm}"`);

      // If we have >45 results and didn't find it, try page 2
      if (posts.length >= 45) {
        const page2Url = `${LAMOVIE_BASE}/wp-api/v1/search?q=${encodeURIComponent(cleanTerm)}&page=2&postType=episodes&postsPerPage=50`;
        console.log(`[la.movie API] Checking page 2...`);
        const page2Str = curlFetch(page2Url);
        if (page2Str && page2Str.trim().startsWith('{')) {
          const page2Data = JSON.parse(page2Str);
          if (!page2Data.error && page2Data.data?.posts) {
            for (const post of page2Data.data.posts as LaMoviePost[]) {
              if (post.type !== 'episodes') continue;
              const titleLower = post.title.toLowerCase();
              const seasonMatch = titleLower.match(/temporada\s+(\d+)/);
              const episodeMatch = titleLower.match(/episodio\s+(\d+)/);
              if (seasonMatch && episodeMatch) {
                const foundSeason = parseInt(seasonMatch[1], 10);
                const foundEpisode = parseInt(episodeMatch[1], 10);
                if (foundSeason === season && foundEpisode === episode) {
                  console.log(`[la.movie API] ✅ Episode match (page 2): "${post.title}" (id=${post._id})`);
                  return post;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[la.movie API] Episode search parse error:', e);
    }
  }

  return null;
}

// ─── La.Movie Player API ─────────────────────────────────────────────────

interface LaMovieEmbed {
  url: string;
  server: string;
  lang: string;
  quality: string;
  size: string | null;
  subtitle: number;
}

interface LaMoviePlayerResponse {
  embeds: LaMovieEmbed[];
  downloads: LaMovieEmbed[];
}

async function getPlayerData(postId: number): Promise<LaMoviePlayerResponse | null> {
  const apiUrl = `${LAMOVIE_BASE}/wp-api/v1/player?postId=${postId}&demo=0`;
  console.log(`[la.movie API] Player API: postId=${postId}`);

  const jsonStr = curlFetch(apiUrl, { 'Referer': `${LAMOVIE_BASE}/` });
  if (!jsonStr || !jsonStr.trim().startsWith('{')) {
    console.error('[la.movie API] Player API returned non-JSON');
    return null;
  }

  try {
    const data = JSON.parse(jsonStr);
    if (data.error && data.message !== 'ok') {
      console.error('[la.movie API] Player API error:', data.message);
      return null;
    }
    return data.data as LaMoviePlayerResponse;
  } catch (e) {
    console.error('[la.movie API] Player API parse error:', e);
    return null;
  }
}

// ─── Embed → HLS Extraction ─────────────────────────────────────────────

/**
 * Detect the server name from an embed URL.
 */
function detectServerName(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('vimeos')) return 'Vimeos';
  if (lower.includes('goodstream')) return 'Goodstream';
  if (lower.includes('hlswish')) return 'HLSWish';
  if (lower.includes('streamwish')) return 'Streamwish';
  if (lower.includes('filelions')) return 'Filelions';
  if (lower.includes('filemoon')) return 'Filemoon';
  if (lower.includes('voe.sx')) return 'Voe';
  if (lower.includes('streamtape')) return 'Streamtape';
  if (lower.includes('dood')) return 'Doodstream';
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return 'Unknown';
  }
}

/**
 * Try to extract a direct M3U8 URL from packed/obfuscated embed pages.
 * Works for: vimeos, goodstream, hlswish, streamwish, filelions
 */
async function extractHlsFromEmbed(embedUrl: string): Promise<string | null> {
  const lower = embedUrl.toLowerCase();

  // Voe uses a different mechanism — keep as external
  if (lower.includes('voe.sx')) return null;

  // Filemoon has a dedicated extractor
  if (lower.includes('filemoon')) {
    try {
      const { extractFilemoon } = await import('../../../../lib/extractors/filemoon');
      return await extractFilemoon(embedUrl, LAMOVIE_BASE);
    } catch (e) {
      console.warn('[la.movie API] Filemoon extraction failed:', e);
      return null;
    }
  }

  // For vimeos, goodstream, hlswish, streamwish, filelions — use the generic packed extractor
  if (lower.match(/(vimeos|goodstream|hlswish|streamwish|filelions)/)) {
    try {
      const { extractGenericPacked } = await import('../../../../lib/extractors/packed');
      return await extractGenericPacked(embedUrl);
    } catch (e) {
      console.warn('[la.movie API] Packed extraction failed:', e);
      return null;
    }
  }

  return null;
}

// ─── Main Stream Builder ─────────────────────────────────────────────────

async function buildStreams(
  playerData: LaMoviePlayerResponse,
  serverOrigin: string,
): Promise<any[]> {
  const streams: any[] = [];
  const extractionPromises: Promise<void>[] = [];

  // Process embeds (streaming servers)
  for (const embed of (playerData.embeds || [])) {
    if (!embed.url) continue;

    const serverName = detectServerName(embed.url);
    const isVoe = embed.url.toLowerCase().includes('voe.sx');

    const stream: any = {
      name: `La.Movie (${serverName})`,
      description: `🎬 ${serverName} (${embed.lang || 'Latino'} ${embed.quality || 'HD'})`,
      url: embed.url,
      isDownload: false,
      behaviorHints: {
        notWebReady: true,
        isDirect: false,
      },
    };
    streams.push(stream);

    // For Voe, keep as external link
    if (isVoe) {
      stream.description = `🌐 ${serverName} (${embed.lang || 'Latino'} ${embed.quality || 'HD'})`;
      stream.behaviorHints.notWebReady = false;
      continue;
    }

    // Try to extract HLS for supported servers
    const embedUrl = embed.url;
    extractionPromises.push(
      extractHlsFromEmbed(embedUrl).then(m3u8 => {
        if (m3u8) {
          stream.url = proxyWrap(m3u8, serverOrigin, embedUrl);
          stream.description += ' ⚡';
          stream.behaviorHints.isDirect = true;
          stream.behaviorHints.notWebReady = false;
          console.log(`[la.movie API] ✅ Extracted HLS from ${serverName}`);
        }
      }).catch(err => {
        console.warn(`[la.movie API] Extraction failed for ${serverName}:`, err?.message);
      })
    );
  }

  // Process downloads (torrents, direct download links)
  for (const dl of (playerData.downloads || [])) {
    if (!dl.url) continue;

    const isMagnet = dl.url.startsWith('magnet:');
    const serverName = isMagnet ? 'Torrent' : detectServerName(dl.url);

    streams.push({
      name: `La.Movie (${serverName})`,
      description: `📥 ${serverName} (${dl.lang || 'Latino'} ${dl.quality || 'HD'})${dl.size ? ` [${dl.size}]` : ''}`,
      url: dl.url,
      isDownload: true,
      behaviorHints: {
        notWebReady: true,
        isDirect: false,
      },
    });
  }

  // Wait for all extractions to complete
  await Promise.all(extractionPromises);

  // Sort: extracted (isDirect) first, then embeds, then downloads
  streams.sort((a, b) => {
    const aScore = a.behaviorHints?.isDirect ? 2 : a.isDownload ? 0 : 1;
    const bScore = b.behaviorHints?.isDirect ? 2 : b.isDownload ? 0 : 1;
    return bScore - aScore;
  });

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = streams.filter(s => {
    if (!s.url) return true;
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  return unique;
}

// ─── API Route Handler ───────────────────────────────────────────────────

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
        JSON.stringify({ streams: [], error: 'Expected /api/lamovie/stream/{type}/{id}' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const type = segments[0]; // 'movie' or 'series'
    let idRaw = segments[1].replace('.json', '');
    if (idRaw.startsWith('tmdb:')) {
      idRaw = idRaw.substring(5);
    }

    // Parse season:episode from the ID for series (format: "tmdbId:season:episode")
    let tmdbIdStr = idRaw;
    let season: number | undefined;
    let episode: number | undefined;

    const parts = idRaw.split(':');
    if (parts.length >= 3) {
      tmdbIdStr = parts[0];
      season = parseInt(parts[1], 10);
      episode = parseInt(parts[2], 10);
    }

    console.log(`[la.movie API] Request: type=${type}, tmdbId=${tmdbIdStr}, season=${season}, episode=${episode}`);

    // Resolve TMDB title
    let searchTitle = tmdbIdStr;
    let expectedYear: number | null = null;
    let altTitles: string[] = [];

    if (/^\d+$/.test(tmdbIdStr)) {
      const info = await getTitleFromTMDB(parseInt(tmdbIdStr, 10), type);
      if (info) {
        searchTitle = info.title;
        expectedYear = info.year;
        altTitles = info.altTitles;
        console.log(`[la.movie API] TMDB: "${info.title}" (${info.year}), alts: [${info.altTitles.slice(0, 3).join(', ')}]`);
      }
    }

    let post: LaMoviePost | null = null;

    if (type === 'movie') {
      // Search movies
      const allTerms = [searchTitle, ...altTitles];
      for (const term of allTerms) {
        post = await searchLaMovie(term, 'movies', expectedYear);
        if (post) break;
      }
    } else if (type === 'series' && season && episode) {
      // Search for specific episode
      post = await searchLaMovieEpisode(searchTitle, season, episode, altTitles);
    }

    if (!post) {
      console.log(`[la.movie API] No match found for "${searchTitle}"`);
      return new Response(
        JSON.stringify({ streams: [] }),
        { status: 200, headers: corsHeaders }
      );
    }

    console.log(`[la.movie API] Found post: "${post.title}" (id=${post._id}, type=${post.type})`);

    // Get player data (embeds + downloads)
    const playerData = await getPlayerData(post._id);
    if (!playerData) {
      console.log(`[la.movie API] No player data for post ${post._id}`);
      return new Response(
        JSON.stringify({ streams: [] }),
        { status: 200, headers: corsHeaders }
      );
    }

    console.log(`[la.movie API] Player returned ${playerData.embeds?.length || 0} embeds, ${playerData.downloads?.length || 0} downloads`);

    // Build and extract streams
    const streams = await buildStreams(playerData, serverOrigin);

    console.log(`[la.movie API] Final: ${streams.length} streams`);

    return new Response(
      JSON.stringify({ streams }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[la.movie API] Fatal error:', error);
    return new Response(
      JSON.stringify({ streams: [], error: error?.message || 'Internal error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
