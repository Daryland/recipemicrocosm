import Image from "next/image";
import Link from "next/link";
import { RatingBadge } from "@/components/Stars";
import { combinedRating } from "@/lib/rating";

export interface RecipeCardData {
  id: string;
  slug: string;
  title: string;
  cuisine: string | null;
  imageUrl: string | null;
  totalTime: number | null;
  // Optional so callers that don't load ratings still type-check.
  sourceRating?: number | null;
  sourceRatingCount?: number | null;
  siteRatingSum?: number;
  siteRatingCount?: number;
}

function Thumbnail({ recipe, sizes }: { recipe: RecipeCardData; sizes: string }) {
  if (recipe.imageUrl) {
    return (
      <Image
        src={recipe.imageUrl}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
      />
    );
  }
  // No photo: show the recipe's initial so the grid keeps its rhythm.
  return (
    <div className="flex h-full items-center justify-center text-3xl font-extrabold tracking-tightest text-ink-faint">
      {recipe.title.charAt(0)}
    </div>
  );
}

function Meta({ recipe }: { recipe: RecipeCardData }) {
  const rating = combinedRating({
    sourceRating: recipe.sourceRating ?? null,
    sourceRatingCount: recipe.sourceRatingCount ?? null,
    siteRatingSum: recipe.siteRatingSum ?? 0,
    siteRatingCount: recipe.siteRatingCount ?? 0,
  });
  if (!recipe.cuisine && !recipe.totalTime && rating.average == null) return null;
  return (
    <>
      {rating.average != null && (
        <p className="mt-1">
          <RatingBadge average={rating.average} count={rating.count} />
        </p>
      )}
      {(recipe.cuisine || recipe.totalTime) && (
        <p className="mt-1 flex gap-3 text-xs text-ink-muted">
          {recipe.cuisine && <span className="truncate">{recipe.cuisine}</span>}
          {recipe.totalTime && <span className="shrink-0 tabular-nums">{recipe.totalTime} min</span>}
        </p>
      )}
    </>
  );
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
        className="group flex items-center gap-4 border-b border-line py-3 first:border-t"
      >
        <div className="relative aspect-square w-14 shrink-0 overflow-hidden rounded bg-line/60 sm:w-16">
          <Thumbnail recipe={recipe} sizes="64px" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-tomato-500 group-hover:decoration-2 group-hover:underline-offset-4">
            {recipe.title}
          </h3>
          <Meta recipe={recipe} />
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/recipes/${recipe.slug}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-line/60">
        <Thumbnail recipe={recipe} sizes="(max-width: 768px) 50vw, 25vw" />
      </div>
      <h3 className="mt-3 text-[0.95rem] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-tomato-500 group-hover:decoration-2 group-hover:underline-offset-4">
        {recipe.title}
      </h3>
      <Meta recipe={recipe} />
    </Link>
  );
}
