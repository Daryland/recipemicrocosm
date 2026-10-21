import Link from "next/link";
import { RecipeCollection } from "@/components/RecipeCollection";
import { browseParams, getBrowseCounts, getBrowsePage, parseBrowseQuery } from "@/lib/browse";
import { SECTIONS } from "@/lib/taxonomy";

interface RecipesPageProps {
  // cuisine, letter, q, the sidebar filters (ingredient, dish, diet, origin, region,
  // quick), and sort/stars/seed from the toolbar. See parseBrowseQuery.
  searchParams: Record<string, string | string[] | undefined>;
}

const tagLabel = (key: string, slug?: string) =>
  SECTIONS.find((s) => s.key === key)?.items.find((i) => i.slug === slug)?.label;

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const urlParams = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))
  );
  const query = parseBrowseQuery(urlParams);
  // Only the first batch is sent with the page; the rest load as you scroll.
  const [firstPage, counts] = await Promise.all([getBrowsePage(query, 0), getBrowseCounts(query)]);
  const params = browseParams(query, urlParams);

  // e.g. "Chicken · Curries · Indian recipes", or "Results for “tacos” · Vegan"
  const filters = [
    tagLabel("ingredient", urlParams.get("ingredient") ?? undefined),
    tagLabel("dish", urlParams.get("dish") ?? undefined),
    tagLabel("diet", urlParams.get("diet") ?? undefined),
    query.origin,
    query.region,
    query.cuisine,
    query.quick ? "Under 30 minutes" : undefined,
  ].filter(Boolean);
  const heading = query.q
    ? [`Results for “${query.q}”`, ...filters].join(" · ")
    : filters.length
    ? `${filters.join(" · ")} recipes`
    : query.letter
    ? `Recipes starting with “${query.letter}”`
    : query.sort === "newest"
    ? "Recently added"
    : "All recipes";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-2 flex items-baseline gap-3">
        <h1 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">{heading}</h1>
        <span className="text-sm tabular-nums text-ink-muted">{counts.total.toLocaleString()}</span>
      </div>
      {counts.all === 0 ? (
        <p className="mt-6 text-ink-muted">
          No recipes match that filter.{" "}
          <Link href="/recipes" className="font-semibold text-tomato-500 underline underline-offset-4">
            Show all recipes
          </Link>
          .
        </p>
      ) : (
        <RecipeCollection
          // A new filter, sort or star rating starts a fresh list.
          key={params.toString()}
          initial={firstPage}
          params={params.toString()}
          sort={query.sort}
          stars={query.stars ?? null}
          starCounts={counts.starCounts}
          total={counts.total}
        />
      )}
    </div>
  );
}
