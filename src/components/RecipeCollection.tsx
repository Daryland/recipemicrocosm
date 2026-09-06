"use client";

import { useEffect, useState } from "react";
import { RecipeCard, type RecipeCardData } from "@/components/RecipeCard";

type ViewMode = "grid" | "list";

const STORAGE_KEY = "recipe-view-mode";

export function RecipeCollection({ recipes }: { recipes: RecipeCardData[] }) {
  const [view, setView] = useState<ViewMode>("grid");

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
      <div className="mb-4 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => changeView("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            view === "grid" ? "bg-ember-500 text-cream" : "text-charcoal-light hover:bg-ember-50"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
            <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => changeView("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            view === "list" ? "bg-ember-500 text-cream" : "text-charcoal-light hover:bg-ember-50"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="1" y="2" width="16" height="3" rx="1.5" fill="currentColor" />
            <rect x="1" y="7.5" width="16" height="3" rx="1.5" fill="currentColor" />
            <rect x="1" y="13" width="16" height="3" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} view="grid" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} view="list" />
          ))}
        </div>
      )}
    </div>
  );
}
