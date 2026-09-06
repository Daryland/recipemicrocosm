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
    <div className="card p-6">
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setMode("url")}
          className={mode === "url" ? "btn-primary" : "btn-secondary"}
        >
          Import from a link
        </button>
        <button
          onClick={() => setMode("manual")}
          className={mode === "manual" ? "btn-primary" : "btn-secondary"}
        >
          Paste in my own
        </button>
      </div>

      {mode === "url" ? (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/some-recipe"
            className="flex-1 rounded-full border border-ember-100 px-4 py-2 text-sm focus:border-ember-500 focus:outline-none"
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
            className="w-full rounded-lg border border-ember-100 px-4 py-2 text-sm focus:border-ember-500 focus:outline-none"
          />
          <input
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Cuisine (optional, e.g. Italian)"
            className="w-full rounded-lg border border-ember-100 px-4 py-2 text-sm focus:border-ember-500 focus:outline-none"
          />
          <textarea
            required
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder={"Ingredients, one per line"}
            rows={5}
            className="w-full rounded-lg border border-ember-100 px-4 py-2 text-sm focus:border-ember-500 focus:outline-none"
          />
          <textarea
            required
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            placeholder={"Steps, one per line"}
            rows={6}
            className="w-full rounded-lg border border-ember-100 px-4 py-2 text-sm focus:border-ember-500 focus:outline-none"
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving…" : "Save recipe"}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-ember-600">{error}</p>}
    </div>
  );
}
