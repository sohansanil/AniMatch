# AniMatch 🌸

**Live Demo:** [https://animatch-web-flax.vercel.app](https://animatch-web-flax.vercel.app)

AniMatch is an AI-powered anime recommendation engine that helps you find your next favorite show. By analyzing 57 million user ratings, AniMatch maps out the complex relationships between over 17,000 anime to deliver personalized, explainable recommendations.

![AniMatch Preview](./animatch-web/public/cherry-bg.png)

## The Problem
Most recommendation sites rely on basic genre tags or popularity lists. AniMatch solves the "what to watch next" problem by using **Collaborative Filtering**—analyzing the actual viewing habits of millions of users to find hidden connections between shows that share the same audience, even if they don't share the same genres.

## Dataset
Trained on the **Kaggle Anime Recommendations Database**, which includes:
*   17,172 Anime titles
*   320,000+ Users
*   57 Million individual ratings

## Architecture & Recommendation Approach
AniMatch uses a **Hybrid Recommender System**:
1. **Matrix Factorization (PyTorch):** We trained an embedding model to represent every anime as a 64-dimensional vector. Shows with similar audience overlap cluster together in this latent space. We use Cosine Similarity to find nearest neighbors.
2. **Metadata Jaccard Similarity:** To counter "seasonality bias" (shows airing in the same season clustering together regardless of content), we apply a 20% weight to genre and theme overlap, acting as a conceptual guardrail.
3. **In-Memory Backend:** The 24MB embedding weights are loaded directly into the Next.js API route, allowing for sub-10ms nearest-neighbor calculations.
4. **Jikan API Integration:** Metadata (posters, synopses, scores) is fetched progressively from the Jikan (MyAnimeList) API to keep the UI rich and updated.

## Tech Stack
*   **Machine Learning:** Python, PyTorch, Pandas, Scikit-learn
*   **Web Application:** Next.js 14, React, TypeScript
*   **Styling:** Tailwind CSS, Lucide Icons
*   **Data Source:** Jikan REST API v4

## How to Run Locally

### 1. Web Application
```bash
cd animatch-web
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. ML Pipeline (Optional)
If you want to retrain the embeddings yourself, you will need to download the `anime.csv` and `rating.csv` files from Kaggle and place them in `ml_pipeline/data/`.
```bash
cd ml_pipeline
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the training script
python scripts/train.py

# Export weights to the Next.js app
python scripts/export.py
```
