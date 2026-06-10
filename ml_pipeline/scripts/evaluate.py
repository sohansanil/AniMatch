import json
import numpy as np

print("Loading embeddings and mappings...")
with open('../models/embeddings.json', 'r') as f:
    embeddings = np.array(json.load(f))

with open('../models/anime_mapping.json', 'r') as f:
    anime_mapping = json.load(f)

mal_to_idx = {int(v): int(k) for k, v in anime_mapping.items()}

# We need the anime titles for readable output.
# The animelist.csv doesn't have titles, so we can fetch them using Jikan API or load a metadata CSV if it exists in the Kaggle dataset.
# The 2020 dataset comes with 'anime.csv' which has 'MAL_ID' and 'Name'.
import pandas as pd

print("Loading anime names and metadata...")
anime_df = pd.read_csv('../data/anime.csv', usecols=['MAL_ID', 'Name'])
name_map = dict(zip(anime_df['MAL_ID'], anime_df['Name']))

with open('../models/anime_meta.json', 'r') as f:
    anime_meta = json.load(f)

def jaccard_similarity(list1, list2):
    s1 = set(list1)
    s2 = set(list2)
    if not s1 or not s2:
        return 0.0
    return len(s1.intersection(s2)) / len(s1.union(s2))

# Function to compute cosine similarity manually
def get_nearest_neighbors(mal_id, top_k=10):
    if mal_id not in mal_to_idx:
        print(f"MAL ID {mal_id} not found in the trained embeddings.")
        return
        
    idx = mal_to_idx[mal_id]
    target_vec = embeddings[idx]
    
    # Get target tags
    target_tags = anime_meta.get(str(mal_id), [])
    
    # Compute cosine similarity
    # similarity = dot(A, B) / (norm(A) * norm(B))
    norms = np.linalg.norm(embeddings, axis=1)
    target_norm = np.linalg.norm(target_vec)
    
    dot_products = np.dot(embeddings, target_vec)
    cosine_sims = dot_products / (norms * target_norm)
    
    # Compute hybrid scores
    hybrid_scores = np.zeros(len(cosine_sims))
    
    for i in range(len(cosine_sims)):
        if i == idx:
            hybrid_scores[i] = -1 # Ignore self
            continue
            
        current_mal_id = str(anime_mapping[str(i)])
        current_tags = anime_meta.get(current_mal_id, [])
        
        jaccard = jaccard_similarity(target_tags, current_tags)
        
        # Clip negative cosine to 0 for a cleaner blend
        cosine = max(0, cosine_sims[i])
        
        # Hybrid formula: 80% CF, 20% Metadata
        hybrid_scores[i] = (0.8 * cosine) + (0.2 * jaccard)
        
    
    # Get top_k indices
    top_indices = np.argsort(hybrid_scores)[::-1][:top_k]
    
    print(f"\n--- Nearest Neighbors for '{name_map.get(mal_id, str(mal_id))}' (MAL ID: {mal_id}) ---")
    for rank, i in enumerate(top_indices, 1):
        rec_mal_id = int(anime_mapping[str(i)])
        hybrid_score = hybrid_scores[i]
        cosine_score = cosine_sims[i]
        jaccard_score = jaccard_similarity(target_tags, anime_meta.get(str(rec_mal_id), []))
        rec_name = name_map.get(rec_mal_id, "Unknown Title")
        print(f"{rank}. {rec_name} (ID: {rec_mal_id}) - Hybrid: {hybrid_score:.4f} [CF: {cosine_score:.4f}, Meta: {jaccard_score:.4f}]")

# Target anime from the user
targets = [
    42897, # Horimiya
    37999, # Kaguya-sama
    16498, # Attack on Titan
    9253,  # Steins;Gate
    5114   # Fullmetal Alchemist: Brotherhood
]

for t in targets:
    get_nearest_neighbors(t)
