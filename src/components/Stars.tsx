const STAR_PATH =
  "M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9z";

/** Five stars filled to `value` (0-5), including partial stars. Display only. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i)) * 100;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <svg viewBox="0 0 20 20" width={size} height={size} className="absolute inset-0 fill-line-strong">
              <path d={STAR_PATH} />
            </svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <svg viewBox="0 0 20 20" width={size} height={size} className="fill-tomato-500">
                <path d={STAR_PATH} />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Compact "★★★★☆ 4.8 (17)" line for recipe cards; renders nothing when unrated. */
export function RatingBadge({ average, count }: { average: number | null; count: number }) {
  if (average == null || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted" title={`${average.toFixed(1)} out of 5`}>
      <Stars value={average} size={12} />
      <span className="tabular-nums">
        {average.toFixed(1)} ({count})
      </span>
    </span>
  );
}

export { STAR_PATH };
