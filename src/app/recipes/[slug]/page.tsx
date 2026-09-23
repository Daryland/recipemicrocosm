import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideoEmbed } from "@/components/VideoEmbed";
import { SaveButton } from "@/components/SaveButton";
import { StarRating } from "@/components/StarRating";
import { combinedRating } from "@/lib/rating";
import { DEVICE_COOKIE, validDeviceId } from "@/lib/device";
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

  // Has this device already rated the recipe?
  const deviceId = validDeviceId(cookies().get(DEVICE_COOKIE)?.value);
  const yourRating = deviceId
    ? await prisma.recipeRating.findUnique({
        where: { recipeId_deviceId: { recipeId: recipe.id, deviceId } },
        select: { value: true },
      })
    : null;

  const ingredients = decodeStringList(recipe.ingredients);
  const steps = decodeStringList(recipe.steps);

  const facts = [
    recipe.totalTime ? { label: "Total time", value: `${recipe.totalTime} min` } : null,
    recipe.servings ? { label: "Serves", value: String(recipe.servings) } : null,
    recipe.cuisine ? { label: "Cuisine", value: recipe.cuisine } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <article className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tightest sm:text-5xl">
          {recipe.title}
        </h1>

        <div className="mt-4">
          <StarRating
            recipeId={recipe.id}
            initial={combinedRating(recipe)}
            initialYourRating={yourRating?.value ?? null}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-line py-4">
          {facts.length > 0 && (
            <dl className="flex flex-wrap gap-x-10 gap-y-3">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs text-ink-muted">{f.label}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <SaveButton recipeId={recipe.id} initialSaved={initialSaved} />
        </div>
      </header>

      {recipe.imageUrl && (
        <div className="relative mb-12 aspect-[16/9] w-full overflow-hidden rounded">
          <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover" />
        </div>
      )}

      {recipe.videoUrl && (
        <div className="mb-12">
          <VideoEmbed url={recipe.videoUrl} />
        </div>
      )}

      <div className="grid gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
        <section>
          <h2 className="section-title">Ingredients</h2>
          <ul className="divide-y divide-line">
            {ingredients.map((ingredient, i) => (
              <li key={i} className="py-2.5 text-[0.95rem] leading-snug">
                {ingredient}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="section-title">Steps</h2>
          <ol className="space-y-6">
            {steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="pt-px text-lg font-extrabold tabular-nums leading-snug text-tomato-500">
                  {i + 1}
                </span>
                <p className="max-w-prose text-[0.95rem] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.sourceUrl && (
        <p className="mt-14 border-t border-line pt-4 text-xs text-ink-muted">
          Source:{" "}
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            {recipe.sourceName ?? recipe.sourceUrl}
          </a>
        </p>
      )}
    </article>
  );
}
