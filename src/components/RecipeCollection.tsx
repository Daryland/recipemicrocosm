"use client";

import { useEffect, useMemo, useState } from "react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import { combinedRating } from "@/lib/rating";

type ViewMode = "grid" | "list";
export type SortMode = "az" | "rating" | "newest" | "random";

const STORAGE_KEY = "recipe-view-mode";

const SORTS: { mode: SortMode; label: string }[] = [
  { mode: "az", label: "A–Z" },
  { mode: "rating", label: "Top rated" },
  { mode: "newest", label: "Newest" },
  { mode: "random", label: "Surprise me" },
];

// Ignores case and leading spaces/punctuation, and orders "2 Ingredient" before "10 Minute".
const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true, ignorePunctuation: true });
const titleKey = (r: RecipeCardData) => r.title.trim();

// 5, 4, 3, 2, 1 stars, or 0 for unrated.
type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;
const STAR_FILTERS: { stars: StarFilter; label: string }[] = [
  { stars: 5, label: "5 ★" },
  { stars: 4, label: "4 ★" },
  { stars: 3, label: "3 ★" },
  { stars: 2, label: "2 ★" },
  { stars: 1, label: "1 ★" },
];

interface Rated {
  recipe: RecipeCardData;
  // The one-decimal average shown on the card (4.96 shows, and sorts, as 5.0); null if unrated.
  shown: number | null;
  count: number;
  stars: StarFilter;
}

function rate(recipe: RecipeCardData): Rated {
  const { average, count } = combinedRating({
    sourceRating: recipe.sourceRating ?? null,
    sourceRatingCount: recipe.sourceRatingCount ?? null,
    siteRatingSum: recipe.siteRatingSum ?? 0,
    siteRatingCount: recipe.siteRatingCount ?? 0,
  });
  const shown = average == null || count === 0 ? null : Math.round(average * 10) / 10;
  // "4 stars" covers 4.0-4.9 as shown on the card; ratings under 1 count as 1 star.
  const stars = (shown == null ? 0 : Math.max(1, Math.floor(shown))) as StarFilter;
  return { recipe, shown, count, stars };
}

const filterButton = (active: boolean) =>
  `h-8 rounded px-3 text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-40 ${
    active ? "bg-ink text-paper" : "text-ink-muted hover:bg-line/60 hover:text-ink disabled:hover:bg-transparent"
  }`;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// `recipes` arrive newest first; initialSort comes from the sidebar's ?sort= links.
export function RecipeCollection({
  recipes,
  initialSort = "az",
}: {
  recipes: RecipeCardData[];
  initialSort?: SortMode;
}) {
  const [view, setView] = useState<ViewMode>("grid");
  // A shuffle can't match between the server render and the browser, so "Surprise me"
  // first renders A–Z and shuffles once the page is live (see the effect below).
  const [sort, setSort] = useState<SortMode>(initialSort === "random" ? "az" : initialSort);
  // Bumped on every "Surprise me" click so each click reshuffles.
  const [shuffleRound, setShuffleRound] = useState(0);
  // null = all ratings.
  const [starFilter, setStarFilter] = useState<StarFilter | null>(null);

  // A new search or filter starts over with the requested sort and all ratings.
  useEffect(() => {
    setSort(initialSort);
    if (initialSort === "random") setShuffleRound((n) => n + 1);
    setStarFilter(null);
  }, [recipes, initialSort]);

  const rated = useMemo(() => recipes.map(rate), [recipes]);
  const starCounts = useMemo(() => {
    const counts = new Map<StarFilter, number>();
    for (const r of rated) counts.set(r.stars, (counts.get(r.stars) ?? 0) + 1);
    return counts;
  }, [rated]);

  const sorted = useMemo(() => {
    const shown = starFilter == null ? rated : rated.filter((r) => r.stars === starFilter);
    const byTitle = (a: Rated, b: Rated) => collator.compare(titleKey(a.recipe), titleKey(b.recipe));
    let ordered: Rated[];
    if (sort === "random") ordered = shuffle(shown);
    else if (sort === "rating") {
      // Highest shown rating first, then most votes (a 5.0 from 40 votes before a 5.0 from 6); unrated last.
      ordered = [...shown].sort((a, b) => (b.shown ?? -1) - (a.shown ?? -1) || b.count - a.count || byTitle(a, b));
    } else if (sort === "newest") ordered = shown;
    else ordered = [...shown].sort(byTitle);
    return ordered.map((r) => r.recipe);
    // shuffleRound is a deliberate dependency: it forces a fresh shuffle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rated, sort, starFilter, shuffleRound]);

  function changeSort(next: SortMode) {
    setSort(next);
    if (next === "random") setShuffleRound((n) => n + 1);
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  function changeView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by star rating">
          <button
            type="button"
            onClick={() => setStarFilter(null)}
            aria-pressed={starFilter == null}
            className={filterButton(starFilter == null)}
          >
            All
          </button>
          {STAR_FILTERS.map(({ stars, label }) => {
            const count = starCounts.get(stars) ?? 0;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setStarFilter(stars)}
                disabled={count === 0}
                aria-pressed={starFilter === stars}
                className={filterButton(starFilter === stars)}
              >
                {label} <span className="font-normal tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-1" role="group" aria-label="Sort recipes">
            {SORTS.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => changeSort(mode)}
                aria-pressed={sort === mode}
                title={mode === "random" && sort === "random" ? "Shuffle again" : undefined}
                className={filterButton(sort === mode)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            onClick={() => changeView("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
              view === "grid" ? "bg-ink text-paper" : "text-ink-muted hover:bg-line/60 hover:text-ink"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="7" height="7" rx="1" fill="currentColor" />
              <rect x="10" y="1" width="7" height="7" rx="1" fill="currentColor" />
              <rect x="1" y="10" width="7" height="7" rx="1" fill="currentColor" />
              <rect x="10" y="10" width="7" height="7" rx="1" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => changeView("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
              view === "list" ? "bg-ink text-paper" : "text-ink-muted hover:bg-line/60 hover:text-ink"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="16" height="3" rx="1" fill="currentColor" />
              <rect x="1" y="7.5" width="16" height="3" rx="1" fill="currentColor" />
              <rect x="1" y="13" width="16" height="3" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} view="grid" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {sorted.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} view="list" />
          ))}
        </div>
      )}
    </div>
  );
}
