import fs from 'fs';
import path from 'path';

let embeddings: number[][] | null = null;
let animeMapping: Record<string, number> | null = null;
let malToIdx: Record<number, number> | null = null;
let animeMeta: Record<string, string[]> | null = null;

// Lazy load the data to avoid blocking the main thread during startup,
// but keep it cached in memory for fast subsequent lookups.
function loadData() {
  if (embeddings && animeMapping && malToIdx && animeMeta) return;

  try {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    
    // Load embeddings
    const embeddingsPath = path.join(dataDir, 'embeddings.json');
    if (fs.existsSync(embeddingsPath)) {
      const rawEmbeddings = fs.readFileSync(embeddingsPath, 'utf-8');
      embeddings = JSON.parse(rawEmbeddings);
    }

    // Load mapping
    const mappingPath = path.join(dataDir, 'anime_mapping.json');
    if (fs.existsSync(mappingPath)) {
      const rawMapping = fs.readFileSync(mappingPath, 'utf-8');
      animeMapping = JSON.parse(rawMapping);
      
      // Build reverse lookup (MAL ID -> Matrix Index)
      malToIdx = {};
      for (const [idx, malId] of Object.entries(animeMapping!)) {
        malToIdx[Number(malId)] = Number(idx);
      }
    }

    // Load metadata
    const metaPath = path.join(dataDir, 'anime_meta.json');
    if (fs.existsSync(metaPath)) {
      const rawMeta = fs.readFileSync(metaPath, 'utf-8');
      animeMeta = JSON.parse(rawMeta);
    }
  } catch (error) {
    console.error("Failed to load ML data:", error);
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function jaccardSimilarity(arr1: string[], arr2: string[]): number {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0;
  
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  
  let intersectionSize = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionSize++;
    }
  }
  
  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

export interface RecommendationResult {
  mal_id: number;
  score: number;
  explanation: string;
  tier: 1 | 2;
}

export function getRecommendationsByEmbeddings(malId: number, limit = 10): RecommendationResult[] | null {
  loadData();

  if (!embeddings || !malToIdx || !animeMapping || !animeMeta) {
    console.warn("Embeddings data not available. Falling back to Tier 2.");
    return null; // Triggers Tier 2 fallback
  }

  const idx = malToIdx[malId];
  if (idx === undefined) {
    // This anime is not in our training set (Cold Start Problem)
    return null; // Triggers Tier 2 fallback
  }

  const targetVector = embeddings[idx];
  const targetTags = animeMeta[malId.toString()] || [];
  const scores: { malId: number; score: number }[] = [];

  for (let i = 0; i < embeddings.length; i++) {
    if (i === idx) continue; // Skip the input anime itself

    const cfScore = cosineSimilarity(targetVector, embeddings[i]);
    const currentMalId = animeMapping[i.toString()];
    
    // Only keep strong positive correlations
    if (cfScore > 0) {
      const currentTags = animeMeta[currentMalId.toString()] || [];
      const metaScore = jaccardSimilarity(targetTags, currentTags);
      
      const finalScore = (0.8 * cfScore) + (0.2 * metaScore);
      scores.push({ malId: currentMalId, score: finalScore });
    }
  }

  // Sort by highest similarity descending
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, limit).map(s => ({
    mal_id: s.malId,
    score: s.score,
    explanation: `${(s.score * 100).toFixed(1)}% Hybrid Match (80% Audience / 20% Metadata)`,
    tier: 1
  }));
}
