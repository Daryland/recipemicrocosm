import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecipeCard } from "@/components/RecipeCard";

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
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <section className="mb-12 rounded-3xl bg-gradient-to-br from-ember-500 to-gold-500 px-8 py-14 text-cream shadow-card">
        <h1 className="max-w-xl font-display text-4xl font-bold leading-tight md:text-5xl">
          Just the recipe. No life story.
        </h1>
        <p className="mt-4 max-w-lg text-ember-50">
          Your own recipe collection — paste one in, pull one from anywhere on the web,
          and browse it all in one place with none of the filler.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/recipes" className="btn-secondary bg-cream">
            Browse the library
          </Link>
          <Link href="/account" className="btn-primary bg-charcoal hover:bg-charcoal/90">
            Add a recipe
          </Link>
        </div>
      </section>

      {popular.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Most popular</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {popular.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      )}

      {popular.length === 0 && (
        <p className="text-charcoal-light">
          Your library is empty so far —{" "}
          <Link href="/account" className="text-ember-600 underline">
            add your first recipe
          </Link>
          .
        </p>
      )}
    </div>
  );
}
