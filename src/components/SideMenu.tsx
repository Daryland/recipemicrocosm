import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function SideMenu() {
  const cuisines = await prisma.recipe.groupBy({
    by: ["cuisine"],
    where: { isPublic: true, cuisine: { not: null } },
    _count: { cuisine: true },
  });

  // Cuisine values like "European - Irish" collapse into one "European" nav
  // entry instead of cluttering the sidebar with one line per sub-region.
  const groups = new Map<string, number>();
  for (const c of cuisines) {
    const raw = c.cuisine ?? "";
    const top = raw.includes(" - ") ? raw.split(" - ")[0] : raw;
    groups.set(top, (groups.get(top) ?? 0) + c._count.cuisine);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-line px-4 py-8 lg:block">
      <nav className="sticky top-24" aria-label="Cuisines">
        <h2 className="mb-2 px-2.5 text-sm font-semibold text-ink">Cuisine</h2>
        <ul>
          <li>
            <Link href="/recipes" className="nav-link block">
              All recipes
            </Link>
          </li>
          {sortedGroups.map(([name, count]) => (
            <li key={name}>
              <Link
                href={`/recipes?cuisine=${encodeURIComponent(name)}`}
                className="nav-link flex items-center justify-between"
              >
                <span>{name}</span>
                <span className="text-xs tabular-nums text-ink-faint">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
