export interface RatingSummary {
  average: number | null; // 0-5, null when nobody has rated yet
  count: number;
}

interface RatingFields {
  sourceRating: number | null;
  sourceRatingCount: number | null;
  siteRatingSum: number;
  siteRatingCount: number;
}

/**
 * Combines the source site's rating with ratings left here, weighted by vote
 * count, so a 4.8 from 17 source votes plus one 5-star vote here becomes 4.81 (18).
 */
export function combinedRating(r: RatingFields): RatingSummary {
  const sourceCount = r.sourceRating != null ? r.sourceRatingCount ?? 0 : 0;
  const count = sourceCount + r.siteRatingCount;
  if (count === 0) return { average: null, count: 0 };
  const total = (r.sourceRating ?? 0) * sourceCount + r.siteRatingSum;
  return { average: total / count, count };
}
