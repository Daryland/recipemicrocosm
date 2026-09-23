import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeSearch } from "@/components/RecipeSearch";

export default async function HomePage() {
  const popular = await prisma.recipe.findMany({
    where: { isPublic: true },
    orderBy: [{ popularity: "desc" }, { createdAt: "desc" }],
    take: 8,
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
