# AniMatch — Product Requirements Document
### Version 1.0 · Day 4 of the 30-Day Builder Journey

---

> **A note before you read this:**
> I've challenged several of your assumptions throughout this document. Some of your original instincts are excellent. Some will hurt you in the timeline you have. Every challenge is marked with a **⚠️ Architect's Note** so you can decide how to handle it.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [User Personas](#3-user-personas)
4. [User Stories](#4-user-stories)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Information Architecture](#7-information-architecture)
8. [User Flow Diagrams](#8-user-flow-diagrams)
9. [Recommendation System Architecture](#9-recommendation-system-architecture)
10. [Data Pipeline Design](#10-data-pipeline-design)
11. [Technical Architecture](#11-technical-architecture)
12. [MVP Scope](#12-mvp-scope)
13. [Post-MVP Roadmap](#13-post-mvp-roadmap)
14. [Design System Direction](#14-design-system-direction)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Success Metrics](#16-success-metrics)
17. [Implementation Phases](#17-implementation-phases)

---

## 1. Executive Summary

**AniMatch** is a portfolio-grade anime recommendation system that answers one question with conviction: *"I liked this anime — what should I watch next?"*

The system is powered by a collaborative filtering model trained on the Kaggle Anime Recommendations Database 2020 (~10M ratings, ~17K anime titles). Using Singular Value Decomposition (SVD), it learns latent representations of each anime — compact embedding vectors that encode what kinds of audiences love them. At inference time, it computes a temporary taste profile from user-selected titles and retrieves the nearest neighbors in embedding space. Every recommendation includes a human-readable explanation grounded in data.

AniMatch is built to be shipped in 10 days and deployed on Vercel. It demonstrates real data science and engineering concepts: data cleaning, matrix factorization, embedding-based similarity search, cold-start handling, and expressive product design. The frontend targets a kawaii-modern aesthetic that makes the project feel like a consumer product rather than a university assignment.

**This is not a social network. It is not a watchlist. It is not a review platform. It is a recommendation engine — and that engine is the product.**

---

## 2. Product Vision

### Vision Statement

> AniMatch understands your taste. Give it two or three titles you love, and it will give you five titles you haven't seen yet — but will.

### What Success Looks Like

A user selects *Horimiya* and *Kaguya-sama*. Within two seconds, they see five recommendations with cards that feel visually premium. Each card tells them *why* the recommendation was made — not in technical jargon, but in natural language that resonates. One of those recommendations is an anime they've never heard of but immediately add to their watchlist.

That moment is the product.

### Guiding Principles (Priority Order)

| # | Principle | What it means in practice |
|---|-----------|--------------------------|
| 1 | **Recommendations First** | Every design decision that slows down or obscures the recommendations gets cut |
| 2 | **Explainability Second** | The "why" earns trust. A black box loses users. |
| 3 | **Visual Beauty Third** | The aesthetic should feel like an anime streaming platform, not a data project |
| 4 | **Performance Always** | Recommendations must feel instant. If it's slow, it's broken. |

---

## 3. User Personas

### Persona 1 — Yuki, the Weekend Binge-Watcher
- **Age:** 20
- **Behaviour:** Watches 2-4 anime per season. Finishes a show and immediately opens Reddit looking for "anime similar to [X]"
- **Pain:** Reddit suggestions are vague, popularity-biased, or from fans who haven't actually watched the show they're recommending. MyAnimeList recommendations feel like a database dump.
- **Goal:** Find her next anime within 3 minutes of finishing her last one.
- **What she needs from AniMatch:** Fast, relevant, non-obvious recommendations that respect her taste.

### Persona 2 — Arjun, the Genre-Weary Veteran
- **Age:** 24
- **Behaviour:** Has watched 200+ anime. Every recommendation site gives him the same top-50 titles.
- **Pain:** He doesn't want popular. He wants *similar*. Specifically: anime with the same *emotional register* as his favorites, not just the same genre tag.
- **Goal:** Discover anime in the long tail that matches his vibe.
- **What he needs from AniMatch:** Embedding-based similarity that surfaces non-obvious connections — the kind of thing only someone who has seen 10,000 shows would notice.

### Persona 3 — Shriya, the New Anime Fan
- **Age:** 18
- **Behaviour:** Has watched 5-10 anime, mostly mainstream. Loved Demon Slayer and Your Lie in April.
- **Pain:** Doesn't know what to watch next. The options are overwhelming.
- **Goal:** A guided experience that doesn't overwhelm her.
- **What she needs from AniMatch:** Confidence that what she's about to watch is worth her time. The explanation is as important as the recommendation itself.

---

## 4. User Stories

### Core Flow

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-01 | User | Search for an anime by title | I can find what I'm looking for without scrolling |
| US-02 | User | Select 1-5 anime I've already enjoyed | I can build a taste profile |
| US-03 | User | See 5-10 recommendations based on my selections | I know what to watch next |
| US-04 | User | See *why* each anime was recommended | I can decide if it's actually right for me |
| US-05 | User | Click on a recommendation to learn more | I can read the synopsis and see the score before committing |
| US-06 | User | Clear my selections and start over | I can explore a different taste profile |

### Search

| ID | Story |
|----|-------|
| US-07 | I want search to feel instant (debounced, <200ms response) so I don't lose momentum |
| US-08 | I want to see cover art in search results so I can identify anime visually, not just by name |
| US-09 | I want to search in English and Japanese so my preferred title format works |

### Recommendations

| ID | Story |
|----|-------|
| US-10 | I want recommendations ranked by relevance so the best match is shown first |
| US-11 | I want to understand the explanation in plain English, not ML jargon |
| US-12 | I want to add a recommendation directly to my taste profile to refine results |
| US-13 | I want to see if a recommendation is completed, airing, or upcoming so I know what I'm getting into |

---

## 5. Functional Requirements

### FR-01 — Anime Search
- Real-time search with debounce (300ms)
- Minimum 2 characters to trigger
- Results show: cover art, title (English + Japanese), year, score, genre tags (max 3)
- Powered by Jikan API (`/v4/anime?q={query}&limit=10`)
- Cache results in memory for 10 minutes to reduce API calls

### FR-02 — Taste Profile Builder
- User can select 1–5 anime
- Selected anime appear as removable chips/cards above the search bar
- Profile auto-updates with each addition/removal
- No account. No persistence. Session-only.
- If 0 anime selected: show empty state with suggested starter titles
- If 1 anime selected: show recommendations immediately (single-title query mode)
- If 2–5 anime selected: aggregate profile mode

### FR-03 — Recommendation Generation
- Triggered automatically when taste profile changes
- Returns 5–10 recommendations
- Excludes titles already in the taste profile
- Ranked by similarity score (cosine similarity, descending)
- Response time target: <800ms end-to-end (including explanation generation)
- Handles anime not in training set via content-based fallback (see Section 9)

### FR-04 — Recommendation Cards
Each card must display:
- Cover art (from Jikan API / MAL CDN)
- Title (English preferred, Japanese if no English title)
- MAL score
- Genre tags (max 3, styled as pills)
- Year + episode count
- Status badge (Finished / Airing / Upcoming)
- Similarity score bar (visual only, 0–100%)
- Explanation snippet (1–2 lines)
- Link to full anime detail

### FR-05 — Recommendation Explanation
Each recommendation must surface at least one of:
- **Audience overlap**: "Fans of Horimiya rated this 9.1 on average"
- **Cluster match**: "Shares the [Slice-of-Life Romance] taste cluster with your selections"
- **Embedding proximity**: "Closest in taste-space to Kaguya-sama" (with cosine score humanized as a %)
- **Genre intersection**: "3 of your 4 selections share: Romance, School, Comedy"
- Explanation is generated at runtime from pre-computed cluster labels + similarity data

### FR-06 — Anime Detail Drawer / Modal
- Opens on card click
- Displays: full synopsis, full genre list, studio, score, rank, MAL link, streaming (if available via Jikan)
- Does NOT open a new page (it's a drawer/modal to preserve context)
- Close button returns user to recommendations

### FR-07 — Starter Suggestions (Empty State)
- When no anime selected, show 8 "popular starting points" as clickable chips
- Categories: Shonen, Romance, Isekai, Slice of Life, Psychological, Sports
- Clicking one populates the search and selects it

### FR-08 — Profile Reset
- "Start Over" button clears taste profile
- Smooth animation returns to empty state

---

## 6. Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| Search API latency | < 300ms (p95) |
| Recommendation API latency | < 800ms (p95) |
| Page load (LCP) | < 2.5s on 4G |
| Time to First Recommendation | < 3s from first selection |

### Reliability
- Jikan API is rate-limited (3 requests/sec). Implement exponential backoff + request queuing.
- If Jikan is unavailable, fall back to local metadata cache (pre-seeded JSON for top 500 anime).
- If recommendation API fails, show graceful error with retry option.

### Scalability
- System is stateless. No database writes. No user sessions. Horizontally scalable on Vercel by default.
- Embedding lookup file must be < 50MB to fit in Vercel serverless function memory.

### Reproducibility ⭐ (Portfolio Priority)
- All training code must be in a reproducible Python notebook with pinned dependencies.
- Dataset download instructions must be in README.
- Model artifacts (embeddings) must be versioned with DVC or stored in repo as a compressed binary.
- A `make pipeline` command should re-run the full offline pipeline from raw data to deployment artifacts.

### Accessibility
- WCAG 2.1 AA color contrast on all text.
- Keyboard navigation for search and selection.
- Screen reader labels on all images and interactive elements.
- Reduced motion mode supported (check `prefers-reduced-motion`).

---

## 7. Information Architecture

```
AniMatch
├── / (Home — Search + Taste Profile + Recommendations)
│   ├── Search Bar
│   ├── Taste Profile Shelf (selected anime chips)
│   ├── Recommendation Grid
│   │   └── Recommendation Card × N
│   │       └── Anime Detail Drawer (modal)
│   └── Empty State (Starter Suggestions)
│
├── /about (Optional — how it works)
│   ├── Algorithm explanation (plain English)
│   ├── Dataset attribution
│   └── GitHub link
│
└── /api
    ├── /api/search?q={query}     (Jikan proxy + caching)
    └── /api/recommend            (POST: { anime_ids: string[] })
```

**Key Architectural Decision: Single Page App**

The entire user experience lives on a single page. The URL does not change when a user builds their taste profile. No routing, no navigation, no distractions. The focus is on the recommendation loop: select → see → explore → refine.

---

## 8. User Flow Diagrams

### Primary Flow

```
LANDING
   │
   ▼
[Search Bar] ──── user types ────► [Search Results Dropdown]
                                           │
                                           ▼ user clicks
                                   [Anime added to Taste Profile]
                                           │
                                    ┌──────┴───────┐
                                    │              │
                                   1st         2nd-5th
                                 selection     selection
                                    │              │
                                    ▼              ▼
                         [Recommendations appear / refresh]
                                    │
                                    ▼
                         [User clicks a Recommendation Card]
                                    │
                                    ▼
                         [Anime Detail Drawer opens]
                                    │
                          ┌─────────┴──────────┐
                          │                    │
                   User closes             User clicks
                   drawer                "Add to Profile"
                          │                    │
                          ▼                    ▼
                   [Returns to          [Title added to
                   recommendations]      profile, recs refresh]
```

### Refinement Loop

```
[Current Taste Profile: Horimiya, Kaguya-sama]
            │
            ▼
[Recommendations: Kimi ni Todoke, Blue Box, Tsuki ga Kirei...]
            │
            ▼
User likes "Blue Box" → Clicks "Add to Profile"
            │
            ▼
[Updated Profile: Horimiya, Kaguya-sama, Blue Box]
            │
            ▼
[Refreshed Recommendations: now tighter romance cluster]
```

---

## 9. Recommendation System Architecture

> This is the most important section. Read it carefully.

---

### ⚠️ Architect's Note #1 — "Matrix Factorization" Is the Training Step, Not the Inference Step

Your brief mentions wanting "matrix factorization at inference time." This is a misunderstanding of the architecture — and it's worth understanding clearly, because explaining this correctly in a portfolio presentation will make you look significantly more knowledgeable.

**Here's the truth:**

Matrix factorization (SVD/ALS/NMF) is how you *train* the model. The output is a set of *embedding vectors* — one per anime. At inference time, you never run matrix factorization again. You simply:
1. Look up the embedding vectors for the user's selected anime
2. Aggregate them (weighted centroid)
3. Compute cosine similarity against all other embeddings
4. Return the top-k

This is exactly what Netflix does in production. The model trains offline. The serving is just a similarity search.

**Why this matters for your portfolio:**
When an interviewer asks "how does your recommendation system work?", you can say: "I factorized the user-item interaction matrix using SVD to learn latent representations of each anime. At serving time, it's pure embedding lookup and cosine similarity — sub-millisecond arithmetic. The ML work was entirely in the training pipeline."

That answer will impress people. Saying "I run matrix factorization at inference time" will confuse them.

---

### ⚠️ Architect's Note #2 — Embeddings-Only Inference Is the Right Architecture for This Project

You asked whether "embeddings-only inference" is the best approach. For a portfolio project with no live users, **yes — unambiguously yes**. Here's why:

You cannot run user-based collaborative filtering at inference time without live user data. You have no users. You have a historical dataset. The only thing you can extract from that dataset that is useful at inference time is the *item embeddings* (what the anime learned about themselves from aggregated user behavior). Those embeddings are the distilled wisdom of 10M rating interactions. They are powerful. Use them.

---

### Training Architecture

```
OFFLINE PIPELINE (runs once, produces artifacts)

1. Kaggle Dataset (user_rating.csv)
         │
         ▼
2. Filter + Clean
   - Remove anime with < 100 ratings
   - Remove users with < 20 ratings
   - Normalize ratings (0-10 → 0-1)
         │
         ▼
3. Build Sparse User-Item Matrix
   Rows: users (~70K filtered)
   Cols: anime (~10K filtered)
   Values: normalized rating (0-1), 0 for missing
         │
         ▼
4. Singular Value Decomposition (SVD)
   Using scipy.sparse.linalg.svds or scikit-surprise
   k = 64 latent dimensions (tunable)
   U matrix (user embeddings) — DISCARD for serving
   Σ (singular values) — used for weighting
   Vt matrix (item embeddings) — KEEP for serving
         │
         ▼
5. Item Embeddings
   Shape: (N_anime, 64)
   Each row: one anime's 64-dimensional taste vector
         │
         ▼
6. Pre-compute Top-50 Similar Anime per Title
   For each anime: cosine_similarity(embedding[i], all_embeddings)
   Store: {anime_id: [{id, score}, ...top50]}
   Format: Compressed JSON (~8MB) or .npz (~2MB)
         │
         ▼
7. Cluster Anime Embeddings
   KMeans with k=25 clusters
   Label each cluster using dominant genres
   Store: {anime_id: cluster_id, cluster_label}
         │
         ▼
OUTPUT ARTIFACTS:
   - embeddings.npz       (raw embeddings, for dynamic queries)
   - similarity_index.json (pre-computed top-50 per anime)
   - cluster_map.json      (anime_id → cluster)
   - anime_meta.json       (id, title, genres, score, cover_url)
```

---

### Serving Architecture

```
INFERENCE (runs per request, <800ms target)

Client sends: POST /api/recommend
Body: { anime_ids: ["21", "32281", "11013"] }

         │
         ▼
1. Load embeddings for selected anime from similarity_index
   (In-memory lookup — loaded once on server start)
         │
         ▼
2. Compute Taste Profile Vector
   If 1 anime: use its embedding directly
   If 2+ anime: weighted mean of embeddings
   (Weight by: user selection order — more recent = higher weight)
         │
         ▼
3. Cosine Similarity Search
   Compare taste_profile_vector against all N embeddings
   Sort by cosine similarity (descending)
   Take top 20 candidates
         │
         ▼
4. Filter + Re-rank
   - Remove anime already in taste profile
   - Remove anime with < 1,000 MAL ratings (too obscure for MVP)
   - Diversity pass: cap at 2 per cluster to avoid monotony
   - Final: return top 10
         │
         ▼
5. Explanation Generation (per recommendation)
   - Identify which input anime it is most similar to
   - Extract shared cluster label
   - Compute genre intersection with taste profile
   - Format: template-based, 1-2 sentences
         │
         ▼
6. Metadata Enrichment
   - Look up anime_meta.json for cover art, title, score, genres
   - Optionally: call Jikan API for fresh data on newer titles
         │
         ▼
Response: Array<RecommendedAnime>
```

---

### ⚠️ Architect's Note #3 — Handling Post-2020 Anime (The Cold Start Problem)

The Kaggle dataset ends in 2020. *Frieren* (2023), *Blue Box* (2024), and many of your example user favorites may not exist in the training data. This is a real problem. Here are the options:

**Option A — Content-Based Fallback (Recommended for MVP)**
When a user selects an anime not in the training set:
1. Fetch its genre/tag list from Jikan API
2. Find the 10 training-set anime with the most genre overlap
3. Average *their* embeddings to create a "proxy embedding" for the new title
4. Use this proxy in the taste profile aggregation
5. Flag it in the UI: "📡 Using content-based matching for {title} (recent release)"

This is honest, explainable, and demonstrates Cold Start awareness — which is a real ML engineering concept you can talk about in interviews.

**Option B — Pre-seed with MAL top-rated post-2020 anime**
Manually extend the dataset by scraping/fetching the top-rated anime from 2020–2025 via Jikan API. Create synthetic embeddings by averaging embeddings of "similar" titles (human-curated). This is more work but produces better quality.

**Option C — Content Embeddings via Sentence Transformers (Post-MVP)**
Use a pre-trained sentence transformer (e.g., `all-MiniLM-L6-v2`) to encode each anime's synopsis into a 384-dimensional vector. Project these into the same space as your SVD embeddings using a linear projection learned on the overlap. This is a genuine technique used in production recommendation systems (warm start).

**Recommendation:** Ship Option A for MVP. Document it as a known limitation. Plan Option C for post-MVP.

---

### ⚠️ Architect's Note #4 — Explainability Without LLMs

Your brief says "The recommendation engine is the hero. Not the AI." I respect this. But explainability is hard without LLMs if you want natural language. Here's a middle path:

**Template-based explanations with data-driven variables:**

```
Template 1 (Cluster):
  "{title} falls in the [{cluster_label}] cluster,
   shared by {input_anime_title} in your profile."

Template 2 (Audience):
  "Users who rated {input_anime} highly also gave
   {title} an average score of {score}."

Template 3 (Genre):
  "Matches {N} of {M} genres from your selections:
   {genre_list}."

Template 4 (Similarity):
  "Closest to {nearest_input_anime} in taste-space
   ({similarity_pct}% similar)."
```

Select the most informative template per recommendation. This is transparent, reproducible, and requires no LLM at runtime.

---

## 10. Data Pipeline Design

### Datasets Required

| Dataset | Source | Size | Purpose |
|---------|--------|------|---------|
| `rating.csv` | [Kaggle: Anime Recommendations DB 2020](https://www.kaggle.com/datasets/hernan4444/anime-recommendation-database-2020) | ~450MB | Training user-item matrix |
| `anime.csv` | Same Kaggle dataset | ~3MB | Base anime metadata |
| Jikan API | `api.jikan.moe/v4` | On-demand | Cover art, current scores, synopsis, streaming |

### Pipeline Steps

```
Step 1: Data Ingestion
  Input:  rating.csv (57M rows), anime.csv (17,562 rows)
  Action: Load with pandas, inspect null rates, dtype check
  Output: Raw DataFrames

Step 2: Filtering
  Input:  Raw rating DataFrame
  Action:
    - Keep only ratings where watching_status == "Completed"
      (removes "Plan to Watch" noise — crucial for quality)
    - Remove anime with < 100 completed ratings
    - Remove users with < 20 completed ratings
    - Clip ratings to [1, 10] range
  Output: Filtered DataFrame (~8M rows, ~10K anime, ~70K users)

Step 3: Normalization
  Action: Per-user mean subtraction (remove user-level bias)
  Why:    A user who rates everything 9/10 and a user who
          rates their favorites 10/10 should have equivalent signal.
  Output: Normalized sparse matrix

Step 4: SVD Training
  Tool:   scipy.sparse.linalg.svds (or scikit-surprise SVD)
  k:      64 latent dimensions
  Time:   ~3-10 minutes on a modern laptop
  Output: item_embedding_matrix (N_anime × 64)

Step 5: Index Building
  Action: For each anime, compute cosine similarity against all others
          Store top-50 most similar with scores
  Time:   ~5 minutes (10K × 10K cosine sim, batched)
  Output: similarity_index.json

Step 6: Clustering
  Tool:   sklearn KMeans, k=25
  Action: Cluster anime embeddings, label each cluster by
          most frequent genres within it
  Output: cluster_map.json, cluster_labels.json

Step 7: Metadata Export
  Action: Join anime.csv with Jikan enrichment for top 1000 anime
          Cache cover URLs, synopses, airing status
  Output: anime_meta.json (compact, ~2MB)

Step 8: Validation
  Action: Sample 10 well-known anime, manually inspect top-5 sims
  Check:  Horimiya → should see romance slice-of-life
          Fullmetal Alchemist → should see action adventure
          Steins;Gate → should see thriller sci-fi
  Output: Validation report in notebook
```

### Pipeline Reproducibility Checklist
- [ ] `requirements.txt` with pinned versions
- [ ] `pipeline.py` or `Makefile` that runs all steps
- [ ] Random seed set for SVD and KMeans (`np.random.seed(42)`)
- [ ] Pipeline output file hashes in `ARTIFACTS.md`
- [ ] Raw data download instructions in `README.md`

---

## 11. Technical Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                  │
│  Next.js 14 App Router · TypeScript · Tailwind CSS   │
│  Framer Motion · React Query                         │
└──────────────┬───────────────────────────────────────┘
               │  HTTPS
┌──────────────▼───────────────────────────────────────┐
│                  VERCEL EDGE / SERVERLESS              │
│                                                        │
│  /api/search      /api/recommend                      │
│  └─► Jikan Proxy  └─► Embedding Lookup                │
│       + Cache           + Cosine Sim                  │
│                         + Explanation                  │
└──────────────┬───────────────────────────────────────┘
               │  Bundled at Deploy Time
┌──────────────▼───────────────────────────────────────┐
│               STATIC ARTIFACTS (in /public or bundle)  │
│                                                        │
│  similarity_index.json   ~8MB compressed               │
│  cluster_map.json        ~200KB                        │
│  anime_meta.json         ~2MB                          │
└──────────────────────────────────────────────────────┘
               │  External API (rate-limited)
┌──────────────▼───────────────────────────────────────┐
│                      JIKAN API v4                      │
│              api.jikan.moe (public, free)              │
└──────────────────────────────────────────────────────┘
```

### Technology Choices & Justifications

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) | Vercel-native, server components reduce JS bundle |
| Language | TypeScript | Type safety on recommendation response shapes |
| Styling | Tailwind CSS | Fastest way to implement custom design system |
| Animation | Framer Motion | Production-quality spring animations without overhead |
| Data Fetching | TanStack Query (React Query) | Cache + loading states for search + recommendations |
| ML Pipeline | Python (scipy, sklearn, pandas) | Standard data science stack |
| Artifact Format | JSON (compressed) + .npz for embeddings | Human-readable, easy to debug |
| Deployment | Vercel | Free tier, instant preview URLs, Edge Functions |

### API Contracts

#### `POST /api/recommend`
```typescript
// Request
interface RecommendRequest {
  anime_ids: string[];        // MAL anime IDs (1-5 items)
  limit?: number;             // default: 10
}

// Response
interface RecommendResponse {
  recommendations: Recommendation[];
  profile_summary: string;    // e.g. "Romance × School Life × Comedy"
}

interface Recommendation {
  anime_id: string;
  title: string;
  title_japanese: string;
  cover_url: string;
  score: number;
  genres: string[];
  year: number;
  episode_count: number | null;
  status: 'Finished' | 'Airing' | 'Upcoming';
  similarity_score: number;     // 0-1 (cosine similarity)
  explanation: {
    primary: string;           // Main explanation sentence
    tags: string[];            // Quick chips: "Romance Cluster", "School Life Match"
    nearest_input: string;     // Title of most similar input anime
  };
}
```

#### `GET /api/search?q={query}`
```typescript
interface SearchResponse {
  results: SearchResult[];
  cached: boolean;
}

interface SearchResult {
  anime_id: string;
  title: string;
  title_japanese: string;
  cover_url: string;
  score: number;
  genres: string[];
  year: number;
  in_training_set: boolean;    // True if we have embeddings for this
}
```

---

## 12. MVP Scope

### ✅ In MVP

| Feature | Priority | Notes |
|---------|----------|-------|
| Anime search (Jikan-powered) | P0 | Core loop |
| Taste profile builder (1-5 anime) | P0 | Core loop |
| Recommendation generation | P0 | Core loop |
| Recommendation cards with explanation | P0 | Core differentiator |
| Anime detail drawer | P1 | Trust-builder |
| Starter suggestions (empty state) | P1 | Reduces friction |
| Cold-start fallback (genre proxy) | P1 | Correctness for popular recent anime |
| Profile reset / clear | P1 | Basic usability |
| About page (how it works) | P2 | Portfolio credibility |
| Responsive design (mobile + desktop) | P1 | Many anime fans use mobile |

### ❌ Explicitly Excluded (MVP)

| Feature | Why excluded |
|---------|-------------|
| User accounts / login | Not the product |
| Watchlists / collections | Not the product |
| Social features | Not the product |
| Reviews / comments | Not the product |
| Anime Atlas visualization | Scope; post-MVP |
| Full training set (57M rows) | Filter to completed-only (~8M) for quality |
| Live retraining | Unnecessary; embeddings are stable |
| Anime streaming links | Jikan provides them; can add in 1hr if wanted |

---

## 13. Post-MVP Roadmap

### Phase 2 — Depth (Weeks 3-4 of Builder Journey)

**Anime Atlas** — The visualization that made Sprout memorable.
A 2D scatter plot of all anime in embedding space, projected via UMAP or t-SNE. Color-coded by cluster. Hoverable points show mini-cards. When the user selects an anime, its position lights up, and the recommendations glow around it. This is the portfolio showpiece.

**Warm-Start Embeddings** — For post-2020 anime, use a sentence transformer to encode synopses into a content vector. Learn a projection matrix from content-space to SVD-space using the overlapping titles. New anime gets a synthesized embedding.

**Expanded Explanation Detail** — Click "Why this?" on a recommendation to see a mini-explainer: the cluster visualization, the genre radar chart, the similarity breakdown.

### Phase 3 — Portfolio Presentation Layer

**"How It Works" Page** — Animated step-by-step walkthrough of the recommendation pipeline. Think Apple-style scroll storytelling. Shows the matrix, the SVD decomposition, the embedding space. Makes the algorithm the hero.

**Share-able Taste Profile** — Generate a URL like `/profile?ids=21,32281,11013` that anyone can open to see the same recommendations. No backend state required — just encode the IDs in the URL.

**Benchmark Dashboard** — Hidden `/admin` page showing model quality metrics: coverage, average similarity score distribution, cluster distribution of recommendations. Not for users — for portfolio conversations.

---

## 14. Design System Direction

### Design Identity

**AniMatch** should feel like what happens when a boutique Japanese stationery brand designs a streaming platform. Not Crunchyroll. Not Netflix. Something lighter, more personal, more emotional.

The design signature: **soft luminosity**. Everything glows slightly. Cards have a gentle inner light. The background is a gradient that shifts from ivory at the top to a pale lavender at the bottom — like late-afternoon light through shoji paper. Against this, the anime cards stand out with their vivid cover art, making the user's selections feel curated and precious.

---

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--sakura` | `#FFB7C5` | Accent color, selected states, hover glows |
| `--yuki` | `#F0F4FF` | Background base (ivory-white) |
| `--fuji` | `#7B6FCA` | Primary action, links, similarity bars |
| `--hoshi` | `#FFDD88` | Score badges, highlights |
| `--sumi` | `#1A1B2E` | Primary text, dark card backgrounds |
| `--kasumi` | `rgba(255,255,255,0.65)` | Glass card surfaces |
| `--mist` | `#E8ECFF` | Soft borders, dividers |
| `--koi` | `#FF8FAB` | Warning/error states (warm, not harsh) |

**Gradient signature:**
```css
background: linear-gradient(160deg, #F7F0FF 0%, #F0F4FF 45%, #EFF6FF 100%);
```

---

### Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Display (hero) | `Plus Jakarta Sans` | 700-800 | Rounded, confident, modern Japanese-adjacent |
| Body | `Inter` | 400-500 | Maximum readability |
| Labels / tags | `Inter` | 600 | Uppercase, tracked, small |
| Score / numbers | `JetBrains Mono` | 500 | Makes numbers feel precise and data-y |

**Type Scale (Tailwind):**
- `text-4xl font-extrabold` — Hero headline ("Find your next anime.")
- `text-xl font-semibold` — Section titles
- `text-base` — Body text
- `text-sm font-medium` — Genre tags, card metadata
- `text-xs tracking-wider uppercase font-semibold` — Labels, eyebrows

---

### Component Specifications

**Recommendation Card (main unit)**
```
┌─────────────────────────────────────┐
│ ┌────────┐  ●  Kimi ni Todoke       │
│ │        │  ★ 8.83  · 2009 · 37 ep │
│ │ COVER  │  [Romance] [School] [Shojo]│
│ │  ART   │                          │
│ └────────┘  "Closest to Horimiya    │
│             in taste-space (91%)    │
│                                     │
│  ████████████████░░░░  91% match    │
│  "Shares Warm Romance Cluster"      │
└─────────────────────────────────────┘
```
- Glassmorphism surface: `backdrop-blur-sm bg-white/70 border border-white/40`
- Subtle `box-shadow: 0 4px 24px rgba(123, 111, 202, 0.08)`
- On hover: card lifts 4px, sakura glow on border
- Cover art is squared (1:1), borderless left edge

**Taste Profile Chips**
```
[× Horimiya 💜] [× Kaguya-sama 💜] [+ Add more...]
```
- Pill-shaped, soft purple fill
- Cover art thumbnail (24px circle) inside chip
- Remove button on left (×)
- Framer Motion: slide-in from left when added, shrink-out when removed

**Similarity Bar**
- Custom CSS: gradient from `#fuji` to `#sakura` at 100%
- Animated width on mount (spring physics)
- Height: 4px, rounded-full, soft background track

---

### Motion Principles

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Card enter | Fade up + scale from 0.95 | 300ms, spring |
| Card hover | Lift + glow | 200ms ease |
| Chip add | Slide in from left | 250ms spring |
| Chip remove | Scale to 0 + fade | 200ms ease |
| Recommendation refresh | Stagger: each card 50ms apart | — |
| Drawer open | Slide up from bottom | 350ms spring |
| Search dropdown | Fade + scale from 0.98 | 150ms ease |

**Rule:** No animation should feel like a loading indicator. Every animation should feel like the product responding to touch.

---

### ⚠️ What to Avoid (Anti-patterns for this project)

| Don't | Why |
|-------|-----|
| Dark mode only | Kills the soft luminous aesthetic you're going for |
| Generic blue primary (`#3B82F6`) | Kills distinctiveness |
| Grid of identical cards with no hierarchy | Boring; weight the #1 recommendation |
| "Match Score: 0.872" displayed raw | Humanize: "91% match" or a visual bar |
| Loading spinners | Use skeleton cards instead |
| Empty error messages ("Something went wrong") | Explain and offer a path forward |

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Kaggle dataset is too large to process on laptop | High | High | Filter early; use only "Completed" ratings. Processed data is ~8M rows, ~1GB RAM peak — manageable. |
| SVD takes too long to train | Medium | Medium | Use `scipy.sparse.linalg.svds` with `k=64`. Estimated: 10-20 min on modern laptop. Use `implicit` library (ALS) as a faster alternative. |
| Vercel function size limit (50MB) | Medium | High | Pre-compute similarity_index.json. Compress with gzip. If still too large, host on Supabase or R2 and fetch on cold start. |
| Jikan API rate limiting (3 req/s) | High | Medium | Client-side debounce + server-side request queue + local cache (top 500 anime metadata pre-seeded). |
| Popular recent anime (Frieren, Blue Box) not in training set | High | High | Implement Option A cold-start fallback. Display a UI indicator. Document as known limitation. |
| Recommendations feel repetitive (all same cluster) | Medium | Medium | Diversity pass in re-ranking: cap at 2 results per cluster. |
| SVD embeddings are low quality for obscure anime | Medium | Medium | Filter: only include anime with ≥100 completed ratings in training. Accept coverage trade-off. |
| Portfolio project ships too late | Medium | Medium | Hard scope the MVP (as defined in Section 12). No feature creep. Target: shipped in 10 days. |

---

## 16. Success Metrics

### Portfolio Success Metrics (Primary)

These are what matter most for a builder journey project:

| Metric | Target | How to measure |
|--------|--------|---------------|
| Project shipped | ✅ | Live Vercel URL exists |
| README quality | Explains model, data, architecture | Peer review |
| Recommendation quality (manual) | Top 5 recs for Horimiya feel correct to an anime fan | Manual taste test with 3 people |
| Pipeline reproducibility | Another person can run it from scratch in < 1 hour | Have a friend try it |
| Code quality | No TODO comments in merged main branch | Code review |

### Product Success Metrics (Secondary)

| Metric | Target |
|--------|--------|
| Time to first recommendation | < 3 seconds from first selection |
| Recommendation API p95 latency | < 800ms |
| Search response time | < 300ms |
| Cold-start coverage | ≥ 90% of top-200 MAL anime (including recent) handled |

### What You Should Demo

In your portfolio presentation, the ideal demo sequence is:

1. **The Magic Moment:** Select two anime → watch recommendations appear
2. **The Explanation:** Click "Why this?" → show the cluster + similarity explanation
3. **The Refinement Loop:** Add a recommendation to the profile → watch results tighten
4. **The Engineering:** Show the training notebook → explain SVD in 60 seconds
5. **The Cold Start:** Select a 2023 anime → show the fallback indicator + explain why

---

## 17. Implementation Phases

> Target: Shipped in 10 days. This fits your 30-Day Builder Journey timeline.

---

### Phase 1 — Data Pipeline (Days 1–2)

**Goal:** Working embeddings from raw data.

```
Day 1:
  ☐ Download Kaggle Anime Recommendations Database 2020
  ☐ Load and inspect rating.csv + anime.csv
  ☐ Filter: completed-only, min 100 anime ratings, min 20 user ratings
  ☐ Build sparse user-item matrix with scipy
  ☐ Run SVD with k=64

Day 2:
  ☐ Extract item embeddings (Vt matrix)
  ☐ Compute cosine similarity, build top-50 similarity index
  ☐ Run KMeans clustering (k=25)
  ☐ Label clusters by dominant genres
  ☐ Export: similarity_index.json, cluster_map.json, anime_meta.json
  ☐ Manual validation: check Horimiya, FMA, Steins;Gate recommendations
```

**Deliverable:** 3 JSON artifacts ready for serving. A training notebook that tells the full ML story.

---

### Phase 2 — Recommendation API (Days 3–4)

**Goal:** Working `/api/recommend` endpoint.

```
Day 3:
  ☐ Initialize Next.js 14 project with TypeScript + Tailwind
  ☐ Copy JSON artifacts to /public or bundle them
  ☐ Build data loading utility (load once at server start)
  ☐ Implement cosine similarity in TypeScript
  ☐ Build POST /api/recommend handler

Day 4:
  ☐ Implement taste profile aggregation (weighted centroid)
  ☐ Implement diversity re-ranking (cap per cluster)
  ☐ Build GET /api/search (Jikan proxy + cache)
  ☐ Implement cold-start fallback (genre proxy)
  ☐ Test end-to-end with curl / Postman
```

**Deliverable:** Working API. Test with your five example anime from the brief.

---

### Phase 3 — Frontend Core (Days 5–7)

**Goal:** Complete search + recommendations UI.

```
Day 5:
  ☐ Implement design tokens (CSS variables per design system)
  ☐ Build search bar with debounce
  ☐ Build search results dropdown
  ☐ Build taste profile shelf (chips)

Day 6:
  ☐ Build recommendation card component (all metadata)
  ☐ Build similarity score bar (animated)
  ☐ Build explanation component (primary + tags)
  ☐ Wire up recommendations to API

Day 7:
  ☐ Build anime detail drawer/modal
  ☐ Build empty state with starter suggestions
  ☐ Add Framer Motion animations (card enter, chip add/remove)
  ☐ Test full user flow end-to-end
```

**Deliverable:** Complete, interactive prototype running locally.

---

### Phase 4 — Polish + Ship (Days 8–10)

**Goal:** Live, polished, portfolio-ready product.

```
Day 8:
  ☐ Responsive design (mobile-first pass)
  ☐ Loading states (skeleton cards for recommendations)
  ☐ Error states (Jikan down, API timeout)
  ☐ Reduce motion support
  ☐ Accessibility audit (keyboard nav, alt text, contrast)

Day 9:
  ☐ About page ("How AniMatch Works")
  ☐ README: architecture diagram, dataset attribution, how to reproduce
  ☐ Performance pass: compress JSON artifacts, lazy-load images
  ☐ Final design review against anti-patterns list (Section 14)

Day 10:
  ☐ Deploy to Vercel
  ☐ Test on mobile
  ☐ Get feedback from 3 people who watch anime
  ☐ Post on GitHub with full README
  ☐ Celebrate. You shipped a real recommendation system.
```

**Deliverable:** Live URL. GitHub repository. Portfolio entry. 🎉

---

## Appendix A — Recommended Libraries

### Python (Offline Pipeline)
```
pandas==2.1.0
scipy==1.11.0
scikit-learn==1.3.0
numpy==1.24.0
implicit==0.7.2          # ALS, faster alternative to scipy SVD
matplotlib==3.7.0         # For validation visualizations
jupyter==1.0.0
```

### Node.js / Next.js (Serving + Frontend)
```
next@14
typescript@5
tailwindcss@3
framer-motion@11
@tanstack/react-query@5
```

---

## Appendix B — Folder Structure

```
animatch/
├── pipeline/                  # Python ML pipeline
│   ├── 01_data_loading.ipynb
│   ├── 02_filtering_cleaning.ipynb
│   ├── 03_svd_training.ipynb
│   ├── 04_similarity_index.ipynb
│   ├── 05_clustering.ipynb
│   ├── 06_validation.ipynb
│   ├── requirements.txt
│   └── Makefile
│
├── artifacts/                 # Pipeline outputs (gitignored or LFS)
│   ├── similarity_index.json
│   ├── cluster_map.json
│   └── anime_meta.json
│
├── web/                       # Next.js application
│   ├── app/
│   │   ├── page.tsx          # Home (search + recommendations)
│   │   ├── about/page.tsx    # How it works
│   │   └── api/
│   │       ├── recommend/route.ts
│   │       └── search/route.ts
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── TasteProfile.tsx
│   │   ├── RecommendationGrid.tsx
│   │   ├── RecommendationCard.tsx
│   │   ├── AnimeDrawer.tsx
│   │   └── ExplanationChips.tsx
│   ├── lib/
│   │   ├── similarity.ts     # Cosine similarity utilities
│   │   ├── data-loader.ts    # Load and cache JSON artifacts
│   │   └── jikan.ts          # Jikan API client
│   └── public/
│       └── data/             # Compressed artifacts served statically
│
├── README.md
└── ARTIFACTS.md              # Artifact hashes for reproducibility
```

---

*PRD v1.0 · AniMatch · Sohan Aravind Sanil · 30-Day Builder Journey*

*"The recommendations are the product." — Build accordingly.*
