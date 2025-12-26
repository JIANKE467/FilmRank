const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const GENRE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedGenres = {
  expiresAt: 0,
  map: new Map()
};

function getTmdbAuth() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!token && !apiKey) {
    const err = new Error("TMDb credentials not configured");
    err.status = 500;
    throw err;
  }
  return { token, apiKey };
}

async function tmdbRequest(path, params = {}) {
  const { token, apiKey } = getTmdbAuth();
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  if (apiKey) {
    url.searchParams.set("api_key", apiKey);
  }
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`TMDb request failed: ${res.status} ${text}`.trim());
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function searchTmdbMovies({ query, year, language }) {
  const data = await tmdbRequest("/search/movie", {
    query,
    year,
    include_adult: false,
    language
  });
  return Array.isArray(data.results) ? data.results : [];
}

export async function getTmdbGenreMap(language) {
  const now = Date.now();
  if (cachedGenres.expiresAt > now && cachedGenres.map.size > 0) {
    return cachedGenres.map;
  }
  const data = await tmdbRequest("/genre/movie/list", { language });
  const map = new Map();
  if (Array.isArray(data.genres)) {
    for (const genre of data.genres) {
      if (genre && genre.id && genre.name) {
        map.set(genre.id, genre.name);
      }
    }
  }
  cachedGenres = {
    expiresAt: now + GENRE_CACHE_TTL_MS,
    map
  };
  return map;
}

export function buildTmdbPosterUrl(path) {
  if (!path) {
    return null;
  }
  return `${TMDB_IMAGE_BASE}${path}`;
}
