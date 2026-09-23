"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddRecipeForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not import that recipe.");
      router.push(`/recipes/${data.recipe.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          cuisine: cuisine || undefined,
          ingredients: ingredientsText.split("\n").map((s) => s.trim()).filter(Boolean),
          steps: stepsText.split("\n").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that recipe.");
      router.push(`/recipes/${data.recipe.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border border-line bg-white p-5 sm:p-6">
      <div className="mb-5 inline-flex rounded border border-line bg-paper p-0.5" role="tablist">
        {([
          ["url", "Import from a link"],
          ["manual", "Paste in my own"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-[4px] px-3 py-1.5 text-sm font-semibold transition-colors ${
              mode === value ? "bg-white text-ink shadow-[0_0_0_1px_theme(colors.line.strong)]" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/some-recipe"
            aria-label="Recipe link"
            className="field h-10 flex-1"
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Importing…" : "Import"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recipe title"
            className="field"
          />
          <input
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Cuisine (optional, e.g. Italian)"
            className="field"
          />
          <textarea
            required
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder={"Ingredients, one per line"}
            rows={5}
            className="field"
          />
          <textarea
            required
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            placeholder={"Steps, one per line"}
            rows={6}
            className="field"
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving…" : "Save recipe"}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm font-medium text-tomato-600" role="alert">{error}</p>}
    </div>
  );
}
