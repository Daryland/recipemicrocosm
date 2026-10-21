import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecipeCollection, type SortMode } from "@/components/RecipeCollection";
import { REGIONS, SECTIONS } from "@/lib/taxonomy";
import type { Prisma } from "@prisma/client";

interface RecipesPageProps {
  searchParams: {
    cuisine?: string;
    letter?: string;
    q?: string;
    // Sidebar filters (see SideNav); they combine.
    ingredient?: string;
    dish?: string;
    diet?: string;
    origin?: string;
    region?: string;
    quick?: string;
    sort?: string;
  };
}

const SORT_MODES: SortMode[] = ["az", "rating", "newest", "random"];
const tagLabel = (key: string, slug?: string) =>
  SECTIONS.find((s) => s.key === key)?.items.find((i) => i.slug === slug)?.label;

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const { cuisine, letter, q, ingredient, dish, diet, origin, region, quick, sort } = searchParams;
  const tags = [ingredient, dish, diet].filter((t): t is string => !!t);
  const regionOrigins = region ? REGIONS.find((r) => r.name === region)?.origins ?? [] : null;

  const where: Prisma.RecipeWhereInput = {
    isPublic: true,
    AND: [
      // Old-style cuisine links: "European" also covers "European - Irish", etc.
      cuisine ? { OR: [{ cuisine }, { cuisine: { startsWith: `${cuisine} - ` } }] } : {},
      letter ? { title: { startsWith: letter, mode: "insensitive" } } : {},
      q ? { title: { contains: q, mode: "insensitive" } } : {},
      tags.length ? { tags: { hasEvery: tags } } : {},
      origin ? { origin } : {},
      regionOrigins ? { origin: { in: regionOrigins } } : {},
      quick === "30" ? { totalTime: { lte: 30 } } : {},
    ],
  };

  const recipes = await prisma.recipe.findMany({
    where,
    // Newest first, so the "Newest" sort can keep this order; the others re-sort in the browser.
    orderBy: { createdAt: "desc" },
    select: {
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
    },
  });

  // e.g. "Chicken · Curries · Indian recipes", or "Results for “tacos” · Vegan"
  const filters = [
    tagLabel("ingredient", ingredient),
    tagLabel("dish", dish),
    tagLabel("diet", diet),
    origin,
    region,
    cuisine,
    quick === "30" ? "Under 30 minutes" : undefined,
  ].filter(Boolean);
  const heading = q
    ? [`Results for “${q}”`, ...filters].join(" · ")
    : filters.length
    ? `${filters.join(" · ")} recipes`
    : letter
    ? `Recipes starting with “${letter}”`
    : sort === "newest"
    ? "Recently added"
    : "All recipes";
  const initialSort = SORT_MODES.find((m) => m === sort) ?? "az";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-2 flex items-baseline gap-3">
        <h1 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">{heading}</h1>
        <span className="text-sm tabular-nums text-ink-muted">{recipes.length}</span>
      </div>
      {recipes.length === 0 ? (
        <p className="mt-6 text-ink-muted">
          No recipes match that filter.{" "}
          <Link href="/recipes" className="font-semibold text-tomato-500 underline underline-offset-4">
            Show all recipes
          </Link>
          .
        </p>
      ) : (
        <RecipeCollection recipes={recipes} initialSort={initialSort} />
      )}
    </div>
  );
}
