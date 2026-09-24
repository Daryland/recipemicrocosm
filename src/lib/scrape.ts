import * as cheerio from "cheerio";

export interface ScrapedRecipe {
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  ingredients: string[];
  steps: string[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: string;
  cuisine?: string;
  sourceUrl: string;
  sourceName: string;
  sourceRating?: number;
  sourceRatingCount?: number;
}

/** Reads schema.org aggregateRating ({ ratingValue, ratingCount|reviewCount }), scaled to 5 stars. */
export function parseAggregateRating(value: unknown): { rating: number; count: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  const rating = Number(r.ratingValue);
  const count = Number(r.ratingCount ?? r.reviewCount);
  const best = Number(r.bestRating) || 5;
  if (!Number.isFinite(rating) || rating <= 0 || !Number.isFinite(count) || count <= 0) return undefined;
  return { rating: Math.min(5, (rating / best) * 5), count: Math.round(count) };
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", deg: "°", frac12: "½", frac14: "¼", frac34: "¾" };

/** JSON-LD text is often still HTML-escaped ("Mac &amp; Cheese"); turn entities back into characters. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Parses an ISO 8601 duration like "PT30M" or "PT1H15M" into whole minutes. */
function parseIsoDurationToMinutes(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const total = days * 24 * 60 + hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return firstString(value[0]);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return firstString(obj.url ?? obj.contentUrl ?? obj["@id"]);
  }
  return undefined;
}

/** Flattens recipeInstructions, which schema.org allows as strings, HowToStep, or nested HowToSection. */
function flattenInstructions(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    // Some sites put the entire instructions as one newline/HTML-separated string.
    return value
      .split(/\r?\n+/)
      .map((s) => s.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenInstructions(item));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj["@type"] === "HowToSection" && obj.itemListElement) {
      return flattenInstructions(obj.itemListElement);
    }
    if (typeof obj.text === "string") return [obj.text.trim()];
    if (typeof obj.name === "string") return [obj.name.trim()];
  }
  return [];
}

function flattenIngredients(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") return [value.trim()];
  return [];
}

/**
 * schema.org `image` is often a list of sizes, smallest first (e.g. a 225x225
 * thumbnail). Pick the largest: by declared width, else the URL without a
 * WordPress "-225x225" size suffix, else the last entry.
 */
function bestImageUrl(value: unknown): string | undefined {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const candidates = list
    .map((item) => {
      if (typeof item === "string") return { url: item, width: 0 };
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const url = firstString(obj.url ?? obj.contentUrl);
        return url ? { url, width: Number(obj.width) || 0 } : undefined;
      }
      return undefined;
    })
    .filter((c): c is { url: string; width: number } => Boolean(c));
  if (!candidates.length) return undefined;
  const sizeOf = (u: string) => {
    const m = u.match(/-(\d+)x(\d+)\.[a-z]+(?:\?|$)/i);
    return m ? Number(m[1]) : Infinity; // no size suffix = original upload
  };
  return candidates.reduce((best, c) => {
    const cw = c.width || sizeOf(c.url);
    const bw = best.width || sizeOf(best.url);
    return cw >= bw ? c : best;
  }).url;
}

function extractVideoUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  const video = Array.isArray(value) ? value[0] : value;
  if (!video || typeof video !== "object") return undefined;
  const obj = video as Record<string, unknown>;
  const embed = firstString(obj.embedUrl);
  if (embed) return embed;
  return firstString(obj.contentUrl);
}

/**
 * Fallback for pages with no schema.org Recipe data but a plain-HTML layout:
 * an "Ingredients" heading followed by lists, a "Method"/"Instructions"/
 * "Directions" heading followed by a list, and optionally "Notes" with
 * "Total time: 15 minutes" / "Makes 2 servings". Returns undefined unless it
 * finds at least 2 ingredients and 1 step, so articles and roundups are skipped.
 */
function scrapeFromHeadings($: cheerio.CheerioAPI, url: string): ScrapedRecipe | undefined {
  const headings = $("h2, h3, h4");
  const sectionItems = (pattern: RegExp) => {
    const heading = headings.filter((_, el) => pattern.test($(el).text().trim())).first();
    if (!heading.length) return [];
    const items: string[] = [];
    for (let el = heading.next(); el.length && !el.is("h1, h2, h3, h4"); el = el.next()) {
      if (el.is("ul, ol")) {
        el.find("li").each((_, li) => {
          const text = $(li).text().replace(/\s+/g, " ").trim();
          if (text) items.push(text);
        });
      } else if (el.is("p")) {
        // Sub-section labels inside the list area, e.g. "DRESSING:"
        const text = el.text().replace(/\s+/g, " ").trim();
        if (/^[^.!?]{1,40}:$/.test(text)) items.push(text);
      }
    }
    return items;
  };

  const ingredients = sectionItems(/^ingredients\b/i);
  const steps = sectionItems(/^(method|instructions|directions|steps)\b/i).filter((s) => !/:$/.test(s));
  if (ingredients.filter((i) => !/:$/.test(i)).length < 2 || steps.length < 1) return undefined;

  const notes = sectionItems(/^notes?\b/i).join("\n");
  const time = notes.match(/total time:?\s*(?:(\d+)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*min)/i);
  const totalTime = time ? Number(time[1] ?? 0) * 60 + Number(time[2] ?? 0) || undefined : undefined;
  const servings = notes.match(/(?:makes|serves)\s+(\d+(?:\s*-\s*\d+)?\s*[a-z ]*)/i)?.[1]?.trim();

  const title =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "Untitled Recipe";

  return {
    title,
    imageUrl: $('meta[property="og:image"]').attr("content") || undefined,
    ingredients,
    steps,
    totalTime,
    servings,
    sourceUrl: url,
    sourceName: new URL(url).hostname.replace(/^www\./, ""),
  };
}

/** Walks a JSON-LD node tree (which may use @graph) looking for a Recipe node. */
export function findRecipeNode(node: unknown): Record<string, unknown> | undefined {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Recipe")) return obj;
    if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
  }
  return undefined;
}

export async function scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipe> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch page (${res.status})`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  let recipeNode: Record<string, unknown> | undefined;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipeNode) return;
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const found = findRecipeNode(parsed);
      if (found) recipeNode = found;
    } catch {
      // Malformed JSON-LD block; skip it and keep looking.
    }
  });

  if (!recipeNode) {
    const fallback = scrapeFromHeadings($, url);
    if (fallback) return fallback;
    throw new Error(
      "No structured recipe data (schema.org/Recipe) found on that page."
    );
  }

  const title = decodeEntities(firstString(recipeNode.name) ?? "Untitled Recipe");
  const imageUrl = bestImageUrl(recipeNode.image);
  const videoUrl = extractVideoUrl(recipeNode.video);
  const ingredients = flattenIngredients(recipeNode.recipeIngredient ?? recipeNode.ingredients).map(decodeEntities);
  const steps = flattenInstructions(recipeNode.recipeInstructions).map(decodeEntities);
  const prepTime = parseIsoDurationToMinutes(recipeNode.prepTime);
  const cookTime = parseIsoDurationToMinutes(recipeNode.cookTime);
  const totalTime = parseIsoDurationToMinutes(recipeNode.totalTime);
  const servings = firstString(recipeNode.recipeYield);
  const cuisine = firstString(recipeNode.recipeCuisine);
  const aggregate = parseAggregateRating(recipeNode.aggregateRating);

  if (ingredients.length === 0 || steps.length === 0) {
    throw new Error("Found recipe data but it was missing ingredients or steps.");
  }

  return {
    title,
    imageUrl,
    videoUrl,
    ingredients,
    steps,
    prepTime,
    cookTime,
    totalTime,
    servings,
    cuisine,
    sourceUrl: url,
    sourceName: new URL(url).hostname.replace(/^www\./, ""),
    sourceRating: aggregate?.rating,
    sourceRatingCount: aggregate?.count,
  };
}
