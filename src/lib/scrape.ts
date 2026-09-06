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

function extractVideoUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  const video = Array.isArray(value) ? value[0] : value;
  if (!video || typeof video !== "object") return undefined;
  const obj = video as Record<string, unknown>;
  const embed = firstString(obj.embedUrl);
  if (embed) return embed;
  return firstString(obj.contentUrl);
}

/** Walks a JSON-LD node tree (which may use @graph) looking for a Recipe node. */
function findRecipeNode(node: unknown): Record<string, unknown> | undefined {
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
        "Mozilla/5.0 (compatible; RecipeMicroCosmBot/1.0; personal recipe library)",
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
    throw new Error(
      "No structured recipe data (schema.org/Recipe) found on that page."
    );
  }

  const title = firstString(recipeNode.name) ?? "Untitled Recipe";
  const imageUrl = firstString(recipeNode.image);
  const videoUrl = extractVideoUrl(recipeNode.video);
  const ingredients = flattenIngredients(recipeNode.recipeIngredient ?? recipeNode.ingredients);
  const steps = flattenInstructions(recipeNode.recipeInstructions);
  const prepTime = parseIsoDurationToMinutes(recipeNode.prepTime);
  const cookTime = parseIsoDurationToMinutes(recipeNode.cookTime);
  const totalTime = parseIsoDurationToMinutes(recipeNode.totalTime);
  const servings = firstString(recipeNode.recipeYield);
  const cuisine = firstString(recipeNode.recipeCuisine);

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
  };
}
