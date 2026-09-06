import { notFound } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideoEmbed } from "@/components/VideoEmbed";
import { SaveButton } from "@/components/SaveButton";
import { decodeStringList } from "@/lib/recipeJson";

export default async function RecipeDetailPage({ params }: { params: { slug: string } }) {
  const recipe = await prisma.recipe.findUnique({ where: { slug: params.slug } });
  if (!recipe) notFound();

  const session = await getServerSession(authOptions);
  let initialSaved = false;
  if (session?.user) {
    const userId = (session.user as { id: string }).id;
    const existing = await prisma.savedRecipe.findUnique({
      where: { userId_recipeId: { userId, recipeId: recipe.id } },
    });
    initialSaved = Boolean(existing);
  }

  const ingredients = decodeStringList(recipe.ingredients);
  const steps = decodeStringList(recipe.steps);

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {recipe.cuisine && <span className="pill bg-ember-50 text-ember-700">{recipe.cuisine}</span>}
        {recipe.totalTime && <span className="text-sm text-charcoal-light">{recipe.totalTime} min total</span>}
        {recipe.servings && <span className="text-sm text-charcoal-light">Serves {recipe.servings}</span>}
      </div>

      <h1 className="mb-6 font-display text-4xl font-bold">{recipe.title}</h1>

      {recipe.imageUrl && (
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl shadow-card">
          <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover" />
        </div>
      )}

      <div className="mb-8">
        <SaveButton recipeId={recipe.id} initialSaved={initialSaved} />
      </div>

      {recipe.videoUrl && (
        <div className="mb-10">
          <VideoEmbed url={recipe.videoUrl} />
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <section>
          <h2 className="mb-3 text-xl font-bold">Ingredients</h2>
          <ul className="space-y-2">
            {ingredients.map((ingredient, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-500" />
                <span>{ingredient}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Steps</h2>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember-500 text-sm font-semibold text-cream">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.sourceUrl && (
        <p className="mt-10 text-xs text-charcoal-light">
          Source:{" "}
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="underline">
            {recipe.sourceName ?? recipe.sourceUrl}
          </a>
        </p>
      )}
    </article>
  );
}
