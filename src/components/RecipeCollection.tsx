"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";
import type { SortMode } from "@/lib/browse";

type ViewMode = "grid" | "list";

const STORAGE_KEY = "recipe-view-mode";

const SORTS: { mode: SortMode; label: string }[] = [
  { mode: "az", label: "A–Z" },
  { mode: "rating", label: "Top rated" },
  { mode: "newest", label: "Newest" },
  { mode: "random", label: "Surprise me" },
];

const STAR_FILTERS = [5, 4, 3, 2, 1];

// Batches load by themselves as you scroll until this many are showing; after
// that a "Load more" button takes over so the footer stays reachable.
const AUTO_LOAD_LIMIT = 120;

const filterButton = (active: boolean) =>
  `h-8 rounded px-3 text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-40 ${
    active ? "bg-ink text-paper" : "text-ink-muted hover:bg-line/60 hover:text-ink disabled:hover:bg-transparent"
  }`;

interface Props {
  // The first batch, rendered with the page.
  initial: { recipes: RecipeCardData[]; hasMore: boolean };
  // The page's URL params (filters, sort, stars, shuffle seed), reused to fetch later batches.
  params: string;
  sort: SortMode;
  stars: number | null;
  starCounts: Record<number, number>;
  total: number;
}

export function RecipeCollection({ initial, params, sort, stars, starCounts, total }: Props) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("grid");
  const [recipes, setRecipes] = useState(initial.recipes);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  function changeView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  // Sort and star changes reload the list from the server with the new URL.
  function navigate(change: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    change(next);
    startNavigation(() => router.push(`/recipes?${next.toString()}`, { scroll: false }));
  }
  const changeSort = (mode: SortMode) =>
    navigate((p) => {
      if (mode === "az") p.delete("sort");
      else p.set("sort", mode);
      // A fresh seed each time, so "Surprise me" reshuffles on every click.
      p.delete("seed");
    });
  const changeStars = (value: number | null) =>
    navigate((p) => (value == null ? p.delete("stars") : p.set("stars", String(value))));

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(false);
    try {
      const qs = new URLSearchParams(params);
      qs.set("offset", String(recipes.length));
      const res = await fetch(`/api/recipes/browse?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page: { recipes: RecipeCardData[]; hasMore: boolean } = await res.json();
      setRecipes((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...page.recipes.filter((r) => !seen.has(r.id))];
      });
      setHasMore(page.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const autoLoad = hasMore && !error && recipes.length < AUTO_LOAD_LIMIT;

  // Fetch the next batch when the bottom of the list comes within ~2 screens of view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !autoLoad) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "1200px 0px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // loadMore reads the latest state; re-observe after each batch so a still-visible
    // sentinel triggers the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, recipes.length]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by star rating">
          <button
            type="button"
            onClick={() => changeStars(null)}
            aria-pressed={stars == null}
            className={filterButton(stars == null)}
          >
            All
          </button>
          {STAR_FILTERS.map((value) => {
            const count = starCounts[value] ?? 0;
            return (
              <button
                key={value}
                type="button"
                onClick={() => changeStars(value)}
                disabled={count === 0 && stars !== value}
                aria-pressed={stars === value}
                className={filterButton(stars === value)}
              >
                {value} ★ <span className="font-normal tabular-nums opacity-70">{count.toLocaleString()}</span>
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

      <div className={`transition-opacity ${navigating ? "opacity-50" : ""}`} aria-busy={navigating}>
        {recipes.length === 0 ? (
          <p className="text-ink-muted">No recipes with that rating.</p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} view="grid" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} view="list" />
            ))}
          </div>
        )}
      </div>

      <div ref={sentinelRef} className="mt-10 flex flex-col items-center gap-3 text-sm text-ink-muted">
        {recipes.length > 0 && (
          <span className="tabular-nums">
            Showing {recipes.length.toLocaleString()} of {total.toLocaleString()}
          </span>
        )}
        {error && <span className="text-tomato-500">Couldn&apos;t load more recipes.</span>}
        {hasMore && (autoLoad ? loading : true) && (
          <button type="button" onClick={loadMore} disabled={loading} className="btn-secondary min-w-32">
            {loading ? "Loading…" : error ? "Try again" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
