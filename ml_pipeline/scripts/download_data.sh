#!/usr/bin/env bash
# Fetches the Anime Recommendation Database 2020 dataset from Kaggle
set -e

# Make sure you have the kaggle.json configured at ~/.kaggle/kaggle.json
echo "Downloading the Kaggle dataset..."
kaggle datasets download -d hernan4444/anime-recommendation-database-2020

echo "Unzipping the dataset..."
unzip -o anime-recommendation-database-2020.zip -d ../data

echo "Cleaning up..."
rm anime-recommendation-database-2020.zip

echo "Download complete!"
