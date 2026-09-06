import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function SideMenu() {
  const cuisines = await prisma.recipe.groupBy({
    by: ["cuisine"],
    where: { isPublic: true, cuisine: { not: null } },
    _count: { cuisine: true },
    orderBy: { _count: { cuisine: "desc" } },
  });

  return (
    <aside className="hidden w-64 shrink-0 border-r border-ember-100 bg-white/60 px-5 py-6 lg:block">
      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-charcoal-light">
          Cuisine
        </h2>
        <ul className="space-y-1">
          <li>
            <Link href="/recipes" className="pill block hover:bg-ember-50">
              All recipes
            </Link>
          </li>
          {cuisines.map((c) => (
            <li key={c.cuisine}>
              <Link
                href={`/recipes?cuisine=${encodeURIComponent(c.cuisine ?? "")}`}
                className="pill flex items-center justify-between hover:bg-ember-50"
              >
                <span>{c.cuisine}</span>
                <span className="text-xs text-charcoal-light">{c._count.cuisine}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
