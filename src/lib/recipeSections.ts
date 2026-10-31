/**
 * Multi-part recipes ("For the dough", "For the sauce") are stored in the same
 * flat ingredients/steps lists, with each part's name as its own entry ending
 * in a colon, e.g. ["For the dough:", "2 cups flour", ..., "For the sauce:", ...].
 */

export interface RecipeSection {
  title: string | null;
  items: string[];
}

// Headings that just repeat the list's own label add nothing.
const REDUNDANT_TITLE_RE = /^(ingredients?|instructions?|directions?|methods?|steps?|preparation|you will need|for this recipe you.ll need)$/i;

/** Turns a part name into its stored form: "For the Sauce" -> "For the Sauce:". */
export function sectionHeader(name: string): string {
  return `${name.replace(/[​﻿]/g, "").replace(/\s+/g, " ").trim().replace(/[\s:.]+$/, "")}:`;
}

export function isSectionHeader(item: string): boolean {
  const text = item.trim();
  return text.length >= 3 && text.length <= 70 && text.endsWith(":");
}

function headerTitle(item: string): string {
  return item.trim().replace(/^!+/, "").replace(/\s*:+$/, "").trim();
}

/** Splits a stored list into its parts. Items before the first header form an untitled part. */
export function groupSections(items: string[]): RecipeSection[] {
  const sections: RecipeSection[] = [];
  for (const item of items) {
    if (isSectionHeader(item)) {
      const title = headerTitle(item);
      sections.push({ title: REDUNDANT_TITLE_RE.test(title) ? null : title, items: [] });
    } else {
      if (!sections.length) sections.push({ title: null, items: [] });
      sections[sections.length - 1].items.push(item);
    }
  }
  // Drop parts that ended up empty (e.g. two headers in a row), keeping their items' order.
  return sections.filter((s) => s.items.length > 0);
}

export function hasSectionHeaders(items: string[]): boolean {
  return items.some(isSectionHeader);
}

/**
 * Inserts part headers into a flat list, given each part's name and item count
 * as read from the page's HTML. Returns the list unchanged unless the counts add
 * up exactly, so a mismatch never mislabels anything.
 */
export function insertSectionHeaders(items: string[], groups: { name: string; count: number }[]): string[] {
  if (!groups.some((g) => g.name) || hasSectionHeaders(items)) return items;
  if (groups.reduce((n, g) => n + g.count, 0) !== items.length) return items;
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (g.name && g.count > 0) out.push(sectionHeader(g.name));
    out.push(...items.slice(i, i + g.count));
    i += g.count;
  }
  return out;
}
