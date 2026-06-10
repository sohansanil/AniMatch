import { NextResponse } from 'next/server';
import { getRecommendationsByEmbeddings } from '@/lib/similarity';
import { getAnimeById, getRecommendationsByMetadata } from '@/lib/jikan';

export async function POST(request: Request) {
  try {
    const { likedAnimeIds, page = 1 } = await request.json();

    if (!likedAnimeIds || !Array.isArray(likedAnimeIds) || likedAnimeIds.length === 0) {
      return NextResponse.json({ error: 'likedAnimeIds array is required' }, { status: 400 });
    }

    // For the MVP, we will base recommendations off the most recently added anime
    // In a future version, we could average the embeddings of all liked anime
    const targetId = likedAnimeIds[likedAnimeIds.length - 1];

    // Compute top 50 recommendations instantly from memory
    let recommendations = getRecommendationsByEmbeddings(targetId, 50);

    if (!recommendations) {
      // Fallback to Tier 2 (Content/Jikan Based)
      try {
        const jikanRecs = await getRecommendationsByMetadata(targetId);
        
        recommendations = jikanRecs.slice(0, 10).map(rec => ({
          mal_id: rec.mal_id,
          score: 1.0, // Jikan doesn't provide a strict score, just a ranking
          explanation: `Recommended based on similar themes to your recent selection`,
          tier: 2
        }));
      } catch (err) {
        console.error("Jikan fallback failed:", err);
        return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
      }
    }

    // Paginate before enriching to avoid hitting Jikan API 50 times
    const startIndex = (page - 1) * 10;
    const endIndex = startIndex + 10;
    const paginatedRecs = recommendations.slice(startIndex, endIndex);

    // Now, enrich the paginated recommendations with fresh metadata from Jikan
    const enrichedRecommendations = await Promise.all(
      paginatedRecs.map(async (rec) => {
        try {
          const metadata = await getAnimeById(rec.mal_id);
          // Wait 333ms between Jikan API calls to avoid rate limits (3 requests / second)
          await new Promise(resolve => setTimeout(resolve, 334));
          
          return {
            ...rec,
            metadata: {
              title: metadata.title,
              image_url: metadata.images.jpg.large_image_url,
              synopsis: metadata.synopsis,
              genres: metadata.genres.map(g => g.name).join(', '),
              score: metadata.score,
              year: metadata.year,
              episodes: metadata.episodes
            }
          };
        } catch {
          console.error(`Failed to fetch metadata for ${rec.mal_id}`);
          return null;
        }
      })
    );

    const validRecs = enrichedRecommendations.filter(Boolean);

    return NextResponse.json({
      target_id: targetId,
      recommendations: validRecs,
      hasMore: endIndex < recommendations.length
    });

  } catch (error) {
    console.error('Recommend API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
