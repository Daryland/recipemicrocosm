import Image from "next/image";
import Link from "next/link";

export interface RecipeCardData {
  id: string;
  slug: string;
  title: string;
  cuisine: string | null;
  imageUrl: string | null;
  totalTime: number | null;
}

export function RecipeCard({
  recipe,
  view = "grid",
}: {
  recipe: RecipeCardData;
  view?: "grid" | "list";
}) {
  if (view === "list") {
    return (
      <Link
        href={`/recipes/${recipe.slug}`}
        className="card group flex items-center gap-4 overflow-hidden p-3"
      >
        <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl bg-ember-50 sm:w-20">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              sizes="80px"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ember-300">
              <span className="font-display text-xl">🍽</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold leading-snug text-charcoal">
            {recipe.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-charcoal-light">
            {recipe.cuisine && <span className="pill bg-ember-50 px-2 py-0.5">{recipe.cuisine}</span>}
            {recipe.totalTime && <span>{recipe.totalTime} min</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/recipes/${recipe.slug}`} className="card group block overflow-hidden">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ember-50">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ember-300">
            <span className="font-display text-3xl">🍽</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold leading-snug text-charcoal">
          {recipe.title}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-charcoal-light">
          {recipe.cuisine && <span className="pill bg-ember-50 px-2 py-0.5">{recipe.cuisine}</span>}
          {recipe.totalTime && <span>{recipe.totalTime} min</span>}
        </div>
      </div>
    </Link>
  );
}
