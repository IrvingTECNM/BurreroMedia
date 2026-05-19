import * as cheerio from 'cheerio';
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
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };

  try {
    return runCurlFetch(url, { headers });
  } catch (err) {
    console.error('[la.movie API] Failed for:', url);
    return '';
  }
}

interface TMDBInfo {
  title: string;
  year: number | null;
  altTitles: string[];
}

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

    return { title, year, altTitles };
  } catch {
    return null;
  }
}

async function scrapeLaMovie(queryStr: string, expectedYear?: number | null, altTitles?: string[]): Promise<any[]> {
  try {
    const searchTerms = [queryStr, ...(altTitles || [])].filter(Boolean);
    const streams: any[] = [];

    for (const term of searchTerms) {
      const cleanQuery = term.replace(/[&:!?()]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanQuery.length < 3) continue;

      const apiUrl = `${LAMOVIE_BASE}/wp-api/v1/search?q=${encodeURIComponent(cleanQuery)}&page=1&postType=movies&postsPerPage=10`;
      console.log('[la.movie API] Searching API:', cleanQuery);

      const jsonStr = curlFetch(apiUrl);
      if (!jsonStr || !jsonStr.trim().startsWith('{')) continue;

      const data = JSON.parse(jsonStr);
      if (data.error || !data.data || !data.data.posts) continue;

      const posts = data.data.posts;
      if (posts.length === 0) continue;

      let bestMatch: any = null;
      for (const post of posts) {
        if (expectedYear) {
          const releaseYear = post.release_date ? parseInt(post.release_date.substring(0, 4), 10) : null;
          if (releaseYear && Math.abs(releaseYear - expectedYear) <= 1) {
            bestMatch = post;
            break;
          }
        } else {
          bestMatch = post;
          break;
        }
      }

      if (bestMatch) {
        const slug = bestMatch.slug;
        const title = bestMatch.title || bestMatch.original_title || 'la.movie';
        const moviePageUrl = `${LAMOVIE_BASE}/peliculas/${slug}/`;
        
        console.log(`[la.movie API] Found: "${title}" → ${moviePageUrl}`);

        const qualityIds = bestMatch.quality || [];
        const qualityLabels: Record<number, string> = { 495: 'Full HD', 649: 'HD', 496: 'Dual 1080p', 26624: '4K' };
        const qualityName = qualityIds.map((id: number) => qualityLabels[id] || '').filter(Boolean).join(', ') || 'HD';

        const langLabel = title.toLowerCase().includes('dual') ? 'Latino/Subtitulado' : 'Latino';

        // Add external web player fallback
        streams.push({
          name: 'La.Movie',
          description: `🎬 La.Movie (${langLabel} ${qualityName})`,
          url: moviePageUrl,
          behaviorHints: { notWebReady: true, isDirect: false },
        });

        // Break out of search terms loop since we found a match
        break;
      }
    }

    return streams;
  } catch (error) {
    console.error('[la.movie API] error:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
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
      }
    }

    let streams: any[] = [];
    if (type === 'movie') {
      streams = await scrapeLaMovie(searchQuery, expectedYear, altTitles);
    }

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
