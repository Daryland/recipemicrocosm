import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeSearch } from "@/components/RecipeSearch";
import { rotatedSlugs, seasonFor, weekOfSeason } from "@/lib/seasons";

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

const POPULAR_COUNT = 8;
// Keeps one prolific site from filling the whole row.
const MAX_PER_SOURCE = 2;

// Recipes eligible for "Most popular": hand-boosted ones (popularity above the
// default 50) and ones rated 4.5+ by at least 50 people on their source site.
const popularPool = {
  isPublic: true,
  imageUrl: { not: null },
  OR: [{ popularity: { gt: 50 } }, { sourceRating: { gte: 4.5 }, sourceRatingCount: { gte: 50 } }],
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function HomePage() {
  const season = seasonFor();
  const week = weekOfSeason();
  const [pool, fallback, seasonalRecipes] = await Promise.all([
    prisma.recipe.findMany({ where: popularPool, select: { ...cardSelect, sourceName: true } }),
    // Used only if the pool is too small to fill the row (e.g. a fresh library).
    prisma.recipe.findMany({
      where: { isPublic: true },
      orderBy: [{ popularity: "desc" }, { createdAt: "desc" }],
      take: POPULAR_COUNT * 2,
      select: cardSelect,
    }),
    prisma.recipe.findMany({
      where: { isPublic: true, slug: { in: season.categories.flatMap((c) => c.slugs) } },
      select: cardSelect,
    }),
  ]);
  // One recipe per category: this week's pick, or the next one that exists.
  const featured = season.categories.flatMap((category) => {
    const recipe = rotatedSlugs(category, week)
      .map((slug) => seasonalRecipes.find((r) => r.slug === slug))
      .find((r) => r != null);
    return recipe ? [{ label: category.label, recipe }] : [];
  });
  // A fresh random 8 on every visit or refresh, skipping anything already shown "In season".
  const featuredIds = new Set(featured.map((f) => f.recipe.id));
  const perSource = new Map<string, number>();
  const picks = shuffle(pool.filter((r) => !featuredIds.has(r.id)))
    .filter((r) => {
      const n = perSource.get(r.sourceName ?? "") ?? 0;
      perSource.set(r.sourceName ?? "", n + 1);
      return n < MAX_PER_SOURCE;
    })
    .slice(0, POPULAR_COUNT);
  const popular =
    picks.length >= POPULAR_COUNT ? picks : fallback.filter((r) => !featuredIds.has(r.id)).slice(0, POPULAR_COUNT);

  return (
    <div className="mx-auto max-w-6xl">
      <section className="mb-16 border-b border-line pb-14 pt-6">
        <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-tightest sm:text-7xl">
          Just the recipe.
          <br />
          No life story.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted">
          Paste one in or pull one from anywhere on the web, then browse your whole
          collection with none of the filler.
        </p>
        <div className="mt-8 flex max-w-xl">
          <RecipeSearch size="lg" placeholder="What are you cooking?" />
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          Or{" "}
          <Link href="/recipes" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato-500">
            browse the library
          </Link>{" "}
          and{" "}
          <Link href="/account" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato-500">
            add a recipe
          </Link>
          .
        </p>
      </section>

      {featured.length > 0 && (
        <section className="mb-16">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-tomato-500">In season</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{season.name} favorites</h2>
            <p className="mt-1 text-sm text-ink-muted">{season.blurb}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
            {featured.map(({ label, recipe }) => (
              <div key={recipe.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
                <RecipeCard recipe={recipe} />
              </div>
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Most popular</h2>
            <Link href="/recipes" className="text-sm font-semibold text-tomato-500 hover:text-tomato-600">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {popular.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      )}

      {popular.length === 0 && (
        <p className="text-ink-muted">
          Your library is empty.{" "}
          <Link href="/account" className="font-semibold text-tomato-500 underline underline-offset-4">
            Add your first recipe
          </Link>
          .
        </p>
      )}
    </div>
  );
}
