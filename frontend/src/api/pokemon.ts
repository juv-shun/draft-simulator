import type { Pokemon } from '@/types';
import pokemonsFallback from '@/data/pokemons.json';

const POKEMON_API_URL =
  'https://s3.ap-northeast-1.amazonaws.com/juv-shun.website-hosting/pokemon_master_data/pokemons.json';
const CACHE_KEYS = {
  data: 'pokemon-data',
  etag: 'pokemon-etag',
  lastModified: 'pokemon-last-modified',
} as const;

function validatePokemonData(data: unknown): data is Pokemon[] {
  if (!Array.isArray(data)) return false;

  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.type === 'string' &&
      typeof item.imageUrl === 'string',
  );
}

export async function fetchPokemonData(): Promise<Pokemon[]> {
  try {
    const cachedETag = localStorage.getItem(CACHE_KEYS.etag);
    const cachedLastModified = localStorage.getItem(CACHE_KEYS.lastModified);

    const headers: Record<string, string> = {};
    if (cachedETag) {
      headers['If-None-Match'] = cachedETag;
    }
    if (cachedLastModified) {
      headers['If-Modified-Since'] = cachedLastModified;
    }

    const response = await fetch(POKEMON_API_URL, { headers });

    if (response.status === 304) {
      const cachedData = localStorage.getItem(CACHE_KEYS.data);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (validatePokemonData(parsed)) {
          return parsed;
        }
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!validatePokemonData(data)) {
      throw new Error('Invalid pokemon data format received from API');
    }

    const newETag = response.headers.get('ETag');
    const newLastModified = response.headers.get('Last-Modified');

    localStorage.setItem(CACHE_KEYS.data, JSON.stringify(data));
    if (newETag) {
      localStorage.setItem(CACHE_KEYS.etag, newETag);
    }
    if (newLastModified) {
      localStorage.setItem(CACHE_KEYS.lastModified, newLastModified);
    }

    return data;
  } catch (error) {
    console.warn('Failed to fetch pokemon data from S3, using fallback data:', error);

    const cachedData = localStorage.getItem(CACHE_KEYS.data);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (validatePokemonData(parsed)) {
          return parsed;
        }
      } catch {}
    }

    return pokemonsFallback as Pokemon[];
  }
}
