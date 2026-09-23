"use client";

import { useState, useTransition } from "react";
import { Stars, STAR_PATH } from "@/components/Stars";
import type { RatingSummary } from "@/lib/rating";

/**
 * Shows the recipe's combined rating and lets this device add one rating,
 * then change or remove it (e.g. after tapping the wrong star).
 */
export function StarRating({
  recipeId,
  initial,
  initialYourRating,
}: {
  recipeId: string;
  initial: RatingSummary;
  initialYourRating: number | null;
}) {
  const [summary, setSummary] = useState(initial);
  const [yourRating, setYourRating] = useState(initialYourRating);
  const [editing, setEditing] = useState(false);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send(method: "POST" | "DELETE", value?: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/recipes/${recipeId}/rate`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ value }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your rating. Try again.");
        return;
      }
      setSummary({ average: data.average, count: data.count });
      setYourRating(data.yourRating ?? null);
      setEditing(false);
      setHover(0);
    });
  }

  const showPicker = !yourRating || editing;
  // While changing, the current rating stays lit until the pointer picks another.
  const lit = hover || (editing ? yourRating ?? 0 : 0);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-2">
        <Stars value={summary.average ?? 0} size={20} />
        <span className="text-sm tabular-nums text-ink-muted">
          {summary.average != null ? (
            <>
              <span className="font-semibold text-ink">{summary.average.toFixed(1)}</span> ({summary.count}{" "}
              {summary.count === 1 ? "rating" : "ratings"})
            </>
          ) : (
            "No ratings yet"
          )}
        </span>
      </div>

      {showPicker ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-muted">{editing ? "Change your rating:" : "Rate it:"}</span>
          <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rate this recipe">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={n === yourRating}
                aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
                disabled={isPending}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onClick={() => send("POST", n)}
                className="p-0.5 disabled:opacity-50"
              >
                <svg viewBox="0 0 20 20" width={22} height={22} className={n <= lit ? "fill-tomato-500" : "fill-line-strong"}>
                  <path d={STAR_PATH} />
                </svg>
              </button>
            ))}
          </div>
          {editing && (
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink">
              Cancel
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span>
            You rated this {yourRating} {yourRating === 1 ? "star" : "stars"}
          </span>
          <button type="button" disabled={isPending} onClick={() => setEditing(true)} className="underline underline-offset-2 hover:text-ink disabled:opacity-50">
            Change
          </button>
          <button type="button" disabled={isPending} onClick={() => send("DELETE")} className="underline underline-offset-2 hover:text-ink disabled:opacity-50">
            Remove
          </button>
        </div>
      )}

      {error && <span className="text-sm text-tomato-600">{error}</span>}
    </div>
  );
}
