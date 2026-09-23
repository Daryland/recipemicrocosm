import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecipeCollection } from "@/components/RecipeCollection";
import type { Prisma } from "@prisma/client";

interface RecipesPageProps {
  searchParams: { cuisine?: string; letter?: string; q?: string };
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const { cuisine, letter, q } = searchParams;

  const where: Prisma.RecipeWhereInput = {
    isPublic: true,
    // A cuisine like "European" is a collapsed nav group covering values
    // like "European - Irish", "European - Welsh", etc. (see SideMenu).
    ...(cuisine ? { OR: [{ cuisine }, { cuisine: { startsWith: `${cuisine} - ` } }] } : {}),
    ...(letter ? { title: { startsWith: letter, mode: "insensitive" } } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: [{ popularity: "desc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      cuisine: true,
      imageUrl: true,
      totalTime: true,
    },
  });

  const heading = q
    ? `Results for “${q}”`
    : cuisine
    ? `${cuisine} recipes`
    : letter
    ? `Recipes starting with “${letter}”`
    : "All recipes";

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
        <RecipeCollection recipes={recipes} />
      )}
    </div>
  );
}
