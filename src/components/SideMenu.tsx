import { cache, Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SideNav, type MenuCounts } from "@/components/SideNav";

// Counts for every sidebar entry. cache() shares one set of queries between the
// desktop sidebar and the mobile menu rendered in the same request.
const getMenuCounts = cache(async (): Promise<MenuCounts> => {
  const [tagRows, originRows, quick, total] = await Promise.all([
    prisma.$queryRaw<{ tag: string; count: bigint }[]>`
      SELECT unnest(tags) AS tag, COUNT(*) AS count FROM "Recipe" WHERE "isPublic" GROUP BY 1`,
    prisma.recipe.groupBy({ by: ["origin"], where: { isPublic: true, origin: { not: null } }, _count: true }),
    prisma.recipe.count({ where: { isPublic: true, totalTime: { lte: 30 } } }),
    prisma.recipe.count({ where: { isPublic: true } }),
  ]);
  return {
    tags: Object.fromEntries(tagRows.map((r) => [r.tag, Number(r.count)])),
    origins: Object.fromEntries(originRows.map((r) => [r.origin!, r._count])),
    quick,
    total,
  };
});

export async function SideMenu({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const nav = (
    // SideNav reads the URL's filters; Suspense keeps that from opting the page out of streaming.
    <Suspense>
      <SideNav counts={await getMenuCounts()} />
    </Suspense>
  );
  if (variant === "mobile") return nav;

  return (
    // Pinned to the viewport and scrolled on its own so a long menu never
    // stretches the page past the main content (and its footer).
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 self-start overflow-y-auto border-r border-line px-4 py-8 lg:block">
      {nav}
    </aside>
  );
}
