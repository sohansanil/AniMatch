import os
import shutil
import pandas as pd
import json

print("Exporting models to Next.js project...")

src_models_dir = "../models"
dest_data_dir = "../../animatch-web/src/data"

os.makedirs(dest_data_dir, exist_ok=True)

# 1. Copy embeddings and mappings
for filename in ["embeddings.json", "anime_mapping.json"]:
    src_path = os.path.join(src_models_dir, filename)
    dest_path = os.path.join(dest_data_dir, filename)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dest_path)
        print(f"Copied {filename} to {dest_data_dir}")
    else:
        print(f"Warning: {filename} not found in {src_models_dir}")

# 2. Extract and export metadata (Genres/Themes/Demographics from anime.csv)
print("Extracting metadata...")
anime_df = pd.read_csv('../data/anime.csv', usecols=['MAL_ID', 'Genres'])

anime_meta = {}
for _, row in anime_df.iterrows():
    mal_id = str(row['MAL_ID'])
    genres_str = str(row['Genres'])
    
    # Kaggle dataset puts "Unknown" when genres are missing
    if genres_str.lower() == 'unknown' or pd.isna(row['Genres']):
        tags = []
    else:
        # Split by comma and strip whitespace
        tags = [t.strip() for t in genres_str.split(',')]
        
    anime_meta[mal_id] = tags

# Save to Next.js data directory and models directory
meta_dest_path = os.path.join(dest_data_dir, 'anime_meta.json')
meta_src_path = os.path.join(src_models_dir, 'anime_meta.json')

with open(meta_dest_path, 'w') as f:
    json.dump(anime_meta, f)
with open(meta_src_path, 'w') as f:
    json.dump(anime_meta, f)

print(f"Exported anime_meta.json to {dest_data_dir} and {src_models_dir}")
print("Export complete!")
