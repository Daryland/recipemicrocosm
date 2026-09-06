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
    ...(cuisine ? { cuisine } : {}),
    ...(letter ? { title: { startsWith: letter } } : {}),
    ...(q ? { title: { contains: q } } : {}),
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
      <h1 className="mb-6 text-2xl font-bold">{heading}</h1>
      {recipes.length === 0 ? (
        <p className="text-charcoal-light">No recipes match that filter yet.</p>
      ) : (
        <RecipeCollection recipes={recipes} />
      )}
    </div>
  );
}
