import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecipeCard } from "@/components/RecipeCard";
import { AddRecipeForm } from "@/components/AddRecipeForm";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-3 font-display text-2xl font-bold">Sign in to see your library</h1>
        <Link href="/login" className="btn-primary">
          Go to sign in
        </Link>
      </div>
    );
  }

  const userId = (session.user as { id: string }).id;

  const [saved, owned] = await Promise.all([
    prisma.savedRecipe.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { recipe: true },
    }),
    prisma.recipe.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold">My Library</h1>
        <p className="text-sm text-charcoal-light">{session.user.email}</p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Add a recipe</h2>
        <AddRecipeForm />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Recipes I added ({owned.length})</h2>
        {owned.length === 0 ? (
          <p className="text-sm text-charcoal-light">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {owned.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Saved recipes ({saved.length})</h2>
        {saved.length === 0 ? (
          <p className="text-sm text-charcoal-light">
            Browse the <Link href="/recipes" className="underline">library</Link> and save a few favorites.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {saved.map(({ recipe }) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
