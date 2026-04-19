/**
 * TMDB API Configuration
 * https://developer.themoviedb.org/docs
 *
 * Replace TMDB_API_KEY with your own key from themoviedb.org
 */

const TMDB_API_KEY = 'ded2a315221e6d1d975e15f43377321d';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type MediaType = 'movie' | 'tv';
export type TimeWindow = 'day' | 'week';

export interface TMDBMovie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type?: MediaType;
  popularity: number;
  original_language: string;
}

export interface TMDBDetail extends TMDBMovie {
  runtime: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status: string;
  tagline: string;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
  credits?: {
    cast: TMDBCast[];
  };
  videos?: {
    results: TMDBVideo[];
  };
  similar?: {
    results: TMDBMovie[];
  };
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export type ImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

// --- Helper Functions ---

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'es-MX'); // Default to Spanish (Mexico)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchTMDB<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// --- Public API ---

export function getImageUrl(path: string | null, size: ImageSize = 'w342'): string {
  if (!path) return 'https://via.placeholder.com/342x513/141420/6B6B80?text=No+Image';
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: BackdropSize = 'w1280'): string {
  if (!path) return 'https://via.placeholder.com/1280x720/141420/6B6B80?text=No+Backdrop';
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export async function getTrending(mediaType: MediaType = 'movie', timeWindow: TimeWindow = 'week') {
  const data = await fetchTMDB<{ results: TMDBMovie[] }>(`/trending/${mediaType}/${timeWindow}`);
  return data.results;
}

export async function getPopular(mediaType: MediaType = 'movie') {
  const data = await fetchTMDB<{ results: TMDBMovie[] }>(`/${mediaType}/popular`);
  return data.results;
}

export async function getTopRated(mediaType: MediaType = 'movie') {
  const data = await fetchTMDB<{ results: TMDBMovie[] }>(`/${mediaType}/top_rated`);
  return data.results;
}

export async function getNowPlaying() {
  const data = await fetchTMDB<{ results: TMDBMovie[] }>('/movie/now_playing');
  return data.results;
}

export async function search(query: string, mediaType?: MediaType) {
  const path = mediaType ? `/search/${mediaType}` : '/search/multi';
  const data = await fetchTMDB<{ results: TMDBMovie[] }>(path, { query });
  return data.results;
}

export async function getDetails(id: number, mediaType: MediaType): Promise<TMDBDetail> {
  const data = await fetchTMDB<TMDBDetail>(
    `/${mediaType}/${id}`,
    { append_to_response: 'credits,videos,similar' }
  );
  return data;
}

export async function getGenres(mediaType: MediaType) {
  const data = await fetchTMDB<{ genres: { id: number; name: string }[] }>(
    `/genre/${mediaType}/list`
  );
  return data.genres;
}

export function getTitle(item: TMDBMovie): string {
  return item.title || item.name || 'Sin título';
}

export function getReleaseYear(item: TMDBMovie): string {
  const date = item.release_date || item.first_air_date;
  return date ? new Date(date).getFullYear().toString() : '';
}

export function getRatingStars(vote: number): number {
  // Convert from 0-10 to 0-5 stars
  return Math.round((vote / 2) * 10) / 10;
}
