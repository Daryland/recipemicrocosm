import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REGIONS } from "@/lib/taxonomy";
import type { RecipeCardData } from "@/components/RecipeCard";

// Filtering, sorting and paging for /recipes, done in the database so the page
// only ever sends one batch of recipes at a time.

export const PAGE_SIZE = 24;

export type SortMode = "az" | "rating" | "newest" | "random";
const SORT_MODES: SortMode[] = ["az", "rating", "newest", "random"];

export interface BrowseQuery {
  cuisine?: string;
  letter?: string;
  q?: string;
  tags: string[];
  origin?: string;
  region?: string;
  quick: boolean;
  sort: SortMode;
  // Star filter: 5, 4, 3, 2 or 1 (by the one-decimal rating shown on cards).
  stars?: number;
  // Keeps a "Surprise me" order stable while more batches load.
  seed: string;
}

const newSeed = () => Math.random().toString(36).slice(2, 10);

/** Reads /recipes filters from URL params (the page's searchParams or an API request). */
export function parseBrowseQuery(params: URLSearchParams): BrowseQuery {
  const get = (key: string) => params.get(key)?.trim() || undefined;
  const sort = SORT_MODES.find((m) => m === get("sort")) ?? "az";
  const stars = Number(get("stars"));
  const seed = get("seed");
  return {
    cuisine: get("cuisine"),
    letter: get("letter"),
    q: get("q"),
    tags: [get("ingredient"), get("dish"), get("diet")].filter((t): t is string => !!t),
    origin: get("origin"),
    region: get("region"),
    quick: get("quick") === "30",
    sort,
    stars: [1, 2, 3, 4, 5].includes(stars) ? stars : undefined,
    seed: seed && /^[a-z0-9]{1,16}$/i.test(seed) ? seed : newSeed(),
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function whereSql(query: BrowseQuery) {
  const conditions: Prisma.Sql[] = [Prisma.sql`"isPublic"`];
  // Old-style cuisine links: "European" also covers "European - Irish", etc.
  if (query.cuisine) {
    conditions.push(Prisma.sql`(cuisine = ${query.cuisine} OR cuisine LIKE ${escapeLike(query.cuisine) + " - %"})`);
  }
  if (query.letter) conditions.push(Prisma.sql`title ILIKE ${escapeLike(query.letter) + "%"}`);
  if (query.q) conditions.push(Prisma.sql`title ILIKE ${"%" + escapeLike(query.q) + "%"}`);
  if (query.tags.length) conditions.push(Prisma.sql`tags @> ${query.tags}::text[]`);
  if (query.origin) conditions.push(Prisma.sql`origin = ${query.origin}`);
  if (query.region) {
    const origins = REGIONS.find((r) => r.name === query.region)?.origins ?? [];
    conditions.push(Prisma.sql`origin = ANY(${origins}::text[])`);
  }
  if (query.quick) conditions.push(Prisma.sql`"totalTime" <= 30`);
  return Prisma.join(conditions, " AND ");
}

// Each matching recipe with the rating shown on its card (source votes and on-site
// votes combined, rounded to one decimal) and its star bucket. Mirrors combinedRating().
function ratedSql(query: BrowseQuery) {
  return Prisma.sql`
    WITH base AS (
      SELECT id, title, "createdAt",
        (CASE WHEN "sourceRating" IS NOT NULL THEN COALESCE("sourceRatingCount", 0) ELSE 0 END) + "siteRatingCount" AS votes,
        COALESCE("sourceRating", 0) * (CASE WHEN "sourceRating" IS NOT NULL THEN COALESCE("sourceRatingCount", 0) ELSE 0 END)
          + "siteRatingSum" AS points
      FROM "Recipe"
      WHERE ${whereSql(query)}
    ),
    rated AS (
      SELECT id, title, "createdAt", votes,
        CASE WHEN votes > 0 THEN ROUND((points / votes)::numeric, 1) END AS shown
      FROM base
    )
    SELECT id, title, "createdAt", votes, shown,
      CASE WHEN shown IS NULL THEN 0 ELSE GREATEST(1, FLOOR(shown))::int END AS stars
    FROM rated`;
}

function orderSql(query: BrowseQuery) {
  // Ignores case and leading spaces/punctuation, like "  Amish Tomato Soup".
  const byTitle = Prisma.sql`regexp_replace(lower(title), '^[^a-z0-9]+', '') ASC, id ASC`;
  switch (query.sort) {
    case "rating":
      // Highest shown rating first, then most votes (a 5.0 from 40 votes before a 5.0 from 6); unrated last.
      return Prisma.sql`shown DESC NULLS LAST, votes DESC, ${byTitle}`;
    case "newest":
      return Prisma.sql`"createdAt" DESC, id ASC`;
    case "random":
      return Prisma.sql`md5(id || ${query.seed})`;
    default:
      return byTitle;
  }
}

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  cuisine: true,
  imageUrl: true,
  totalTime: true,
  sourceRating: true,
  sourceRatingCount: true,
  siteRatingSum: true,
  siteRatingCount: true,
} as const;

/** One batch of recipes in the requested order, plus whether more remain. */
export async function getBrowsePage(query: BrowseQuery, offset: number) {
  const starFilter = query.stars ? Prisma.sql`WHERE stars = ${query.stars}` : Prisma.empty;
  // One extra row tells us whether there's another batch.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM (${ratedSql(query)}) r ${starFilter}
    ORDER BY ${orderSql(query)}
    LIMIT ${PAGE_SIZE + 1} OFFSET ${offset}`;
  const ids = rows.slice(0, PAGE_SIZE).map((r) => r.id);
  const found = await prisma.recipe.findMany({ where: { id: { in: ids } }, select: cardSelect });
  const byId = new Map(found.map((r) => [r.id, r]));
  const recipes: RecipeCardData[] = ids.flatMap((id) => byId.get(id) ?? []);
  return { recipes, hasMore: rows.length > PAGE_SIZE };
}

/** How many recipes match, in total and per star bucket (for the star filter buttons). */
export async function getBrowseCounts(query: BrowseQuery) {
  const rows = await prisma.$queryRaw<{ stars: number; count: bigint }[]>`
    SELECT stars, COUNT(*) AS count FROM (${ratedSql(query)}) r GROUP BY stars`;
  const starCounts: Record<number, number> = {};
  for (const r of rows) starCounts[r.stars] = Number(r.count);
  const all = Object.values(starCounts).reduce((a, b) => a + b, 0);
  return { total: query.stars ? starCounts[query.stars] ?? 0 : all, all, starCounts };
}

/** URL params for a query, in a stable form (used for page keys and "load more" requests). */
export function browseParams(query: BrowseQuery, params: URLSearchParams) {
  const next = new URLSearchParams(params);
  if (query.sort === "random") next.set("seed", query.seed);
  else next.delete("seed");
  next.sort();
  return next;
}
