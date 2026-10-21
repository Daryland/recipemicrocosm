"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { REGIONS, SECTIONS } from "@/lib/taxonomy";

export interface MenuCounts {
  tags: Record<string, number>;
  origins: Record<string, number>;
  quick: number;
  total: number;
}

// Each section shows this many entries until "Show more" is clicked.
const PREVIEW = 6;

// URL params the sidebar sets on /recipes. They combine, e.g. ?ingredient=chicken&origin=Indian.
type Param = "ingredient" | "dish" | "diet" | "origin" | "region" | "quick" | "sort";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Count({ n }: { n: number }) {
  return <span className="text-xs tabular-nums text-ink-faint">{n.toLocaleString()}</span>;
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-sm font-semibold text-ink hover:bg-line/60"
    >
      {title}
      <Chevron open={open} />
    </button>
  );
}

export function SideNav({ counts }: { counts: MenuCounts }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Filters only carry over while browsing; from a recipe page or home, links start fresh.
  const current = pathname === "/recipes" ? searchParams : new URLSearchParams();

  // Toggles one filter on the current results: clicking the active entry clears it.
  function hrefFor(param: Param, value: string) {
    const next = new URLSearchParams(current);
    if (next.get(param) === value) next.delete(param);
    else next.set(param, value);
    // Origin and region replace each other (and the old cuisine param); a letter jump ends on a new filter.
    if (param === "origin") next.delete("region");
    if (param === "region") next.delete("origin");
    if (param === "origin" || param === "region") next.delete("cuisine");
    next.delete("letter");
    const qs = next.toString();
    return qs ? `/recipes?${qs}` : "/recipes";
  }
  const isActive = (param: Param, value: string) => current.get(param) === value;
  const anyFilter = ["ingredient", "dish", "diet", "origin", "region", "quick", "cuisine", "q", "letter"].some((p) =>
    current.has(p)
  );

  const activeRegion =
    current.get("region") ?? REGIONS.find((r) => r.origins.includes(current.get("origin") ?? ""))?.name ?? null;
  const [open, setOpen] = useState<Record<string, boolean>>({
    quick: true,
    ingredient: true,
    dish: true,
    diet: true,
    origin: activeRegion != null,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>(activeRegion ? { [activeRegion]: true } : {});
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const linkClass = (active: boolean) =>
    `nav-link flex items-center justify-between gap-2 ${active ? "bg-ink text-paper hover:bg-ink hover:text-paper" : ""}`;

  const quickPicks: { label: string; param: Param; value: string; count?: number }[] = [
    { label: "Under 30 minutes", param: "quick", value: "30", count: counts.quick },
    { label: "Top rated", param: "sort", value: "rating" },
    { label: "Recently added", param: "sort", value: "newest" },
    { label: "Surprise me", param: "sort", value: "random" },
  ];

  return (
    <nav aria-label="Browse recipes" className="space-y-4">
      <div>
        <Link href="/recipes" className={linkClass(pathname === "/recipes" && !anyFilter && !current.has("sort"))}>
          <span className="font-semibold">All recipes</span>
          <Count n={counts.total} />
        </Link>
        {anyFilter && (
          <Link href="/recipes" className="nav-link block text-tomato-500 hover:text-tomato-600">
            Clear filters
          </Link>
        )}
      </div>

      <div>
        <SectionHeader title="Quick picks" open={open.quick} onToggle={() => toggle("quick")} />
        {open.quick && (
          <ul className="mt-1">
            {quickPicks.map((p) => (
              <li key={p.label}>
                <Link href={hrefFor(p.param, p.value)} className={linkClass(isActive(p.param, p.value))}>
                  <span>{p.label}</span>
                  {p.count != null && <Count n={p.count} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {SECTIONS.map((section) => {
        // Hide categories nothing is tagged with yet; keep the active one visible.
        const items = section.items.filter((i) => (counts.tags[i.slug] ?? 0) > 0 || isActive(section.key, i.slug));
        const showAll = expanded[section.key] || items.slice(PREVIEW).some((i) => isActive(section.key, i.slug));
        const visible = showAll ? items : items.slice(0, PREVIEW);
        return (
          <div key={section.key}>
            <SectionHeader title={section.title} open={open[section.key]} onToggle={() => toggle(section.key)} />
            {open[section.key] && (
              <ul className="mt-1">
                {visible.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={hrefFor(section.key, item.slug)}
                      className={linkClass(isActive(section.key, item.slug))}
                    >
                      <span>{item.label}</span>
                      <Count n={counts.tags[item.slug] ?? 0} />
                    </Link>
                  </li>
                ))}
                {items.length > PREVIEW && !showAll && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => ({ ...e, [section.key]: true }))}
                      className="nav-link w-full text-left text-ink-faint"
                    >
                      Show {items.length - PREVIEW} more
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}

      <div>
        <SectionHeader title="By origin" open={open.origin} onToggle={() => toggle("origin")} />
        {open.origin && (
          <ul className="mt-1">
            {REGIONS.map((region) => {
              const origins = region.origins
                .filter((o) => (counts.origins[o] ?? 0) > 0)
                .sort((a, b) => (counts.origins[b] ?? 0) - (counts.origins[a] ?? 0));
              if (origins.length === 0) return null;
              const regionCount = origins.reduce((n, o) => n + (counts.origins[o] ?? 0), 0);
              const regionOpen = openRegions[region.name];
              return (
                <li key={region.name}>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setOpenRegions((r) => ({ ...r, [region.name]: !r[region.name] }))}
                      aria-expanded={regionOpen}
                      aria-label={`${regionOpen ? "Hide" : "Show"} ${region.name} countries`}
                      className="rounded p-1.5 text-ink-faint hover:bg-line/60 hover:text-ink"
                    >
                      <Chevron open={regionOpen} />
                    </button>
                    <Link
                      href={hrefFor("region", region.name)}
                      className={`${linkClass(isActive("region", region.name))} min-w-0 flex-1 pl-1`}
                    >
                      <span>{region.name}</span>
                      <Count n={regionCount} />
                    </Link>
                  </div>
                  {regionOpen && (
                    <ul className="ml-7">
                      {origins.map((origin) => (
                        <li key={origin}>
                          <Link href={hrefFor("origin", origin)} className={linkClass(isActive("origin", origin))}>
                            <span>{origin}</span>
                            <Count n={counts.origins[origin] ?? 0} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
