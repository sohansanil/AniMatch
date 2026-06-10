'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Star, Sparkles, X, Info } from 'lucide-react';
import { searchAnime, Anime } from '@/lib/jikan';

interface EnrichedRecommendation {
  mal_id: number;
  tier: number;
  score: number;
  explanation: string;
  metadata: {
    title: string;
    image_url: string;
    score: number;
    synopsis: string;
    genres: string[];
    year?: number;
    episodes?: number;
  };
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [likedAnime, setLikedAnime] = useState<Anime[]>([]);
  const [recommendations, setRecommendations] = useState<EnrichedRecommendation[]>([]);
  const [isGettingRecs, setIsGettingRecs] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2) {
        setIsSearching(true);
        try {
          const results = await searchAnime(query);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const addLikedAnime = (anime: Anime) => {
    if (!likedAnime.find(a => a.mal_id === anime.mal_id)) {
      const newLiked = [...likedAnime, anime];
      setLikedAnime(newLiked);
      setQuery('');
      setSearchResults([]);
      setPage(1);
      fetchRecommendations(newLiked, 1, false);
    }
  };

  const removeLikedAnime = (id: number) => {
    const newLiked = likedAnime.filter(a => a.mal_id !== id);
    setLikedAnime(newLiked);
    setPage(1);
    if (newLiked.length > 0) {
      fetchRecommendations(newLiked, 1, false);
    } else {
      setRecommendations([]);
      setHasMore(false);
    }
  };

  const fetchRecommendations = async (animeList: Anime[], pageNum: number = 1, append: boolean = false) => {
    setIsGettingRecs(true);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedAnimeIds: animeList.map(a => a.mal_id), page: pageNum }),
      });
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setRecommendations(prev => [...prev, ...(data.recommendations || [])]);
        } else {
          setRecommendations(data.recommendations || []);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations', error);
    } finally {
      setIsGettingRecs(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 font-sans selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            <span className="text-4xl md:text-5xl opacity-90">🌸</span>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg pb-1">
              SohAnime
            </h1>
          </div>
          <p className="text-xl font-medium text-slate-200">
            Anime Recommendation Engine
          </p>
          <div className="text-sm text-slate-400 max-w-2xl mx-auto font-light leading-relaxed flex flex-col items-center">
            <p>Find your next favorite anime.</p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 text-[10px] md:text-xs font-semibold text-primary-100 tracking-wide uppercase bg-slate-900/60 border border-slate-700/50 backdrop-blur-md rounded-full px-6 py-3 shadow-2xl">
              <span>17,172 Anime</span>
              <span className="opacity-40">•</span>
              <span>57M Ratings</span>
              <span className="opacity-40">•</span>
              <span>64-Dimensional Taste Engine</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Search & Selected */}
          <div className="lg:col-span-3 space-y-8 sticky top-8">
            <div className="glass-panel rounded-2xl p-6 relative z-20">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" /> Find Anime
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for an anime..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                {isSearching && <Loader2 className="w-5 h-5 text-primary absolute right-3 top-3.5 animate-spin" />}
              </div>

              {/* Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute w-[calc(100%-3rem)] mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto">
                  {searchResults.map((anime) => (
                    <button
                      key={anime.mal_id}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700/50 flex items-center gap-3 transition-colors border-b border-slate-700/50 last:border-0"
                      onClick={() => addLikedAnime(anime)}
                    >
                      <img src={anime.images.jpg.image_url} alt={anime.title} className="w-10 h-14 object-cover rounded-md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-200 truncate">{anime.title}</p>
                        <p className="text-xs text-slate-400">{anime.score ? `Score: ${anime.score}` : 'N/A'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Anime List */}
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-accent" /> Your Watchlist
              </h2>
              {likedAnime.length < 3 && (
                <div className="mb-4 bg-secondary/10 border border-secondary/20 rounded-xl p-5 text-sm text-secondary-100 shadow-inner">
                  <p className="font-bold mb-2 flex items-center gap-1.5 text-secondary-300">
                    <Info className="w-4 h-4" /> Best Results
                  </p>
                  <p className="text-slate-300 mb-3 leading-relaxed">
                    Add 3–5 anime you genuinely love. Mix different anime that represent your taste.
                  </p>
                  <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-slate-400 text-xs mb-1.5 font-medium">Examples:</p>
                    <ul className="text-slate-300 text-xs space-y-1 ml-2">
                      <li>• Horimiya</li>
                      <li>• ReLIFE</li>
                      <li>• Kaguya-sama</li>
                    </ul>
                  </div>
                  <p className="text-slate-400 text-xs mt-3 italic">
                    The more examples you provide, the better AniMatch understands your preferences.
                  </p>
                </div>
              )}
              
              {likedAnime.length > 0 && (
                <div className="space-y-3">
                  {likedAnime.map((anime) => (
                    <div key={anime.mal_id} className="glass-card rounded-xl p-3 flex items-center gap-4">
                      <img src={anime.images.jpg.image_url} alt={anime.title} className="w-12 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-100 line-clamp-1">{anime.title}</h3>
                        <p className="text-sm text-slate-400 line-clamp-1">
                          {anime.genres.slice(0, 3).map(g => g.name).join(', ')}
                        </p>
                      </div>
                      <button 
                        onClick={() => removeLikedAnime(anime.mal_id)}
                        className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recommendations */}
          <div className="lg:col-span-9">
            <div className="glass-panel rounded-2xl p-6 min-h-[600px] max-h-[85vh] overflow-y-auto relative">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-secondary" /> Recommendations
              </h2>

              {isGettingRecs ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="animate-pulse">Analyzing latent space...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-center px-8">
                  <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                  <p>Your recommendations will appear here.</p>
                  <p className="text-sm mt-2">The more anime you add, the better the engine understands your taste.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <div key={rec.mal_id} className="glass-card rounded-xl overflow-hidden flex flex-col sm:flex-row group animate-in fade-in slide-in-from-bottom-4" style={{animationDelay: `${i * 50}ms`}}>
                      <div className="w-full sm:w-40 shrink-0">
                        <img src={rec.metadata.image_url} alt={rec.metadata.title} className="w-full h-56 sm:h-full object-cover" />
                      </div>
                      <div className="p-5 flex-1 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-100 leading-tight mb-1">{rec.metadata.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
                              {rec.metadata.score && <span className="flex items-center gap-1"><span className="text-yellow-500">★</span> {rec.metadata.score}</span>}
                              {rec.metadata.year && <span>• {rec.metadata.year}</span>}
                              {rec.metadata.episodes && <span>• {rec.metadata.episodes} eps</span>}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-sm ${rec.tier === 1 ? 'bg-primary/20 text-primary-300 border border-primary/20' : 'bg-accent/20 text-accent-300 border border-accent/20'}`}>
                            {rec.tier === 1 ? '✨ Audience Match' : '🔍 Genre Match'}
                          </span>
                        </div>
                        
                        {rec.metadata.genres && (
                          <div className="flex flex-wrap gap-1.5">
                            {rec.metadata.genres.map((genre: string) => (
                              <span key={genre} className="px-2 py-0.5 bg-slate-800/50 text-slate-300 rounded text-[10px] font-medium border border-slate-700/50">
                                {genre.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {rec.metadata.synopsis && (
                          <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                            {rec.metadata.synopsis}
                          </p>
                        )}
                        
                        <div className="mt-auto pt-3">
                          <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3.5 text-sm text-slate-300">
                            <p className="font-medium text-slate-200 mb-2.5 flex items-center gap-2 text-xs uppercase tracking-wider">
                              <span className="text-primary-400">✦</span> Why you&apos;ll like this
                            </p>
                            <ul className="space-y-1.5 text-xs text-slate-400 mb-4 ml-1">
                              {rec.tier === 1 ? (
                                <>
                                  <li className="flex items-start gap-2 mb-2 pb-2 border-b border-slate-700/50">
                                    <span className="text-primary-400/80">✦</span> 
                                    Because you liked: <strong className="ml-1 text-slate-200">{likedAnime[likedAnime.length - 1]?.title}</strong>
                                  </li>
                                  <li className="flex items-start gap-2"><span className="text-primary-400/80">✓</span> Strong audience overlap with your selections</li>
                                  <li className="flex items-start gap-2"><span className="text-primary-400/80">✓</span> Shares similar genres and themes</li>
                                  <li className="flex items-start gap-2"><span className="text-primary-400/80">✓</span> Highly popular among viewers with your taste</li>
                                </>
                              ) : (
                                <>
                                  <li className="flex items-start gap-2"><span className="text-accent-400/80">✓</span> Perfect genre and theme match</li>
                                  <li className="flex items-start gap-2"><span className="text-accent-400/80">✓</span> Recommended by the community</li>
                                </>
                              )}
                            </ul>
                            
                            <div className="flex items-center gap-3 text-xs font-medium">
                              <span className="text-slate-500 uppercase tracking-widest text-[10px]">Match</span>
                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" 
                                  style={{ width: `${Math.min(100, Math.round(rec.score * 100))}%` }} 
                                />
                              </div>
                              <span className="text-primary-300 w-8 text-right font-bold">{Math.min(100, Math.round(rec.score * 100))}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {hasMore && (
                    <div className="pt-4 pb-2">
                      <button 
                        onClick={() => {
                          const nextPage = page + 1;
                          setPage(nextPage);
                          fetchRecommendations(likedAnime, nextPage, true);
                        }}
                        disabled={isGettingRecs}
                        className="w-full py-4 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 font-semibold text-sm transition-all flex justify-center items-center gap-2 group shadow-lg"
                      >
                        {isGettingRecs ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Load 10 More Recommendations'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
