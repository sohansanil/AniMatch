const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

export interface Anime {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  synopsis: string;
  score: number;
  year?: number;
  episodes?: number;
  genres: Array<{ mal_id: number; name: string }>;
  themes: Array<{ mal_id: number; name: string }>;
}

export async function searchAnime(query: string): Promise<Anime[]> {
  const url = new URL(`${JIKAN_BASE_URL}/anime`);
  url.searchParams.append('q', query);
  url.searchParams.append('limit', '10');
  // Sort by popularity to get relevant results
  url.searchParams.append('order_by', 'members');
  url.searchParams.append('sort', 'desc');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('Failed to search anime');
  }

  const data = await res.json();
  return data.data;
}

export async function getAnimeById(id: number): Promise<Anime> {
  const res = await fetch(`${JIKAN_BASE_URL}/anime/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch anime details');
  }

  const data = await res.json();
  return data.data;
}

export async function getRecommendationsByMetadata(id: number): Promise<{mal_id: number, title: string, images: unknown, votes: number}[]> {
  // Jikan provides a recommendations endpoint based on MAL's user recommendations
  // This serves as an excellent Tier 2 fallback for anime missing from our embeddings
  const res = await fetch(`${JIKAN_BASE_URL}/anime/${id}/recommendations`);
  if (!res.ok) {
    return []; // Return empty array gracefully if it fails (e.g. rate limit)
  }

  const data = await res.json();
  return data.data.map((rec: { entry: { mal_id: number; title: string; images: unknown }; votes: number }) => ({
    mal_id: rec.entry.mal_id,
    title: rec.entry.title,
    images: rec.entry.images,
    votes: rec.votes
  }));
}
