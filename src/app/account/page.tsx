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
        <h1 className="mb-4 text-2xl font-extrabold tracking-tightest">Sign in to see your library</h1>
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
        <h1 className="text-4xl font-extrabold tracking-tightest">My library</h1>
        <p className="mt-1 text-sm text-ink-muted">{session.user.email}</p>
      </div>

      <section>
        <h2 className="section-title">Add a recipe</h2>
        <AddRecipeForm />
      </section>

      <section>
        <h2 className="section-title">
          Recipes I added <span className="font-medium tabular-nums text-ink-muted">{owned.length}</span>
        </h2>
        {owned.length === 0 ? (
          <p className="text-sm text-ink-muted">Recipes you import or paste in will show up here.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {owned.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">
          Saved recipes <span className="font-medium tabular-nums text-ink-muted">{saved.length}</span>
        </h2>
        {saved.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Browse the <Link href="/recipes" className="font-semibold text-ink underline underline-offset-4">library</Link> and save a few favorites.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {saved.map(({ recipe }) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
