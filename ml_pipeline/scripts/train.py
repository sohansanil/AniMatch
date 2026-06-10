import pandas as pd
import numpy as np
import scipy.sparse as sparse
import implicit
import json
import os

print("Loading dataset...")
# Load only needed columns to save memory
df = pd.read_csv('../data/animelist.csv', usecols=['user_id', 'anime_id', 'rating'])

# Filter out 0 ratings (unrated)
print(f"Total interactions: {len(df)}")
df = df[df['rating'] > 0]
print(f"Interactions with explicit rating: {len(df)}")

print("Mapping IDs to internal indices...")
# Map user and anime IDs to contiguous internal indices
user_ids = df['user_id'].astype("category").cat.codes
anime_ids = df['anime_id'].astype("category").cat.codes

# Create mapping dictionary for anime: internal index -> MAL ID
anime_mapping = dict(enumerate(df['anime_id'].astype("category").cat.categories))
mal_to_idx = {v: k for k, v in anime_mapping.items()}

# Save the mappings
os.makedirs('../models', exist_ok=True)
with open('../models/anime_mapping.json', 'w') as f:
    json.dump(anime_mapping, f)

print("Building sparse matrix...")
# The implicit library expects a user-item sparse matrix for training (in version >=0.6.0)
sparse_user_item = sparse.csr_matrix(
    (df['rating'].astype(float), (user_ids, anime_ids))
)

print("Training ALS model...")
# Initialize the model
model = implicit.als.AlternatingLeastSquares(
    factors=64, # 64 latent factors (dimensions for embedding)
    regularization=0.1,
    iterations=20,
    calculate_training_loss=True
)

# Train the model
model.fit(sparse_user_item)

print("Extracting and saving item embeddings...")
# model.item_factors is a numpy array of shape (num_items, factors)
item_embeddings = model.item_factors.tolist()

with open('../models/embeddings.json', 'w') as f:
    json.dump(item_embeddings, f)

print("Training complete! Embeddings saved to ../models/")
