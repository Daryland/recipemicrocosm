import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();

const SITE = "rickbayless.com";
const SITEMAP_URL = "https://www.rickbayless.com/recipe-sitemap.xml";
const USER_AGENT =
  "Mozilla/5.0 (compatible; RecipeMicroCosmBot/1.0; personal recipe library)";
const DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getRecipeUrls(): Promise<string[]> {
  const xml = await fetchHtml(SITEMAP_URL);
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return matches.filter((u) => /\/recipe\/[^/]+\/?$/.test(u) && u !== "https://www.rickbayless.com/recipe/");
}

interface ParsedRecipe {
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  ingredients: string[];
  steps: string[];
  slug: string;
}

function parseRecipePage(html: string, url: string): ParsedRecipe | null {
  const $ = cheerio.load(html);

  const h1 = cleanText($("h1").first().text());
  const spanishTitle = cleanText($(".spanish-title").first().text());
  const title = spanishTitle ? `${h1} (${spanishTitle})` : h1;
  if (!title) return null;

  const imageUrl =
    $("#recipe-image").attr("data-src") ||
    $("#recipe-image").attr("src") ||
    undefined;

  const videoUrl = $(".recipe-instructions iframe[src*='youtube']").attr("src") || undefined;

  const ingredients = $(".recipe-ingredients li")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean);

  let steps = $(".recipe-instructions p")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean);
  if (steps.length === 0) {
    steps = $(".recipe-instructions li")
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter(Boolean);
  }

  if (ingredients.length === 0 || steps.length === 0) return null;

  const slugMatch = url.match(/\/recipe\/([^/]+)\/?$/);
  const slug = slugMatch ? slugMatch[1] : cleanText(h1).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return { title, imageUrl, videoUrl, ingredients, steps, slug };
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (await prisma.recipe.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function main() {
  console.log("Fetching recipe sitemap...");
  let urls = await getRecipeUrls();
  console.log(`Found ${urls.length} recipe URLs.`);
  const limit = process.env.SCRAPE_LIMIT ? Number(process.env.SCRAPE_LIMIT) : undefined;
  if (limit) urls = urls.slice(0, limit);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const failedUrls: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const existing = await prisma.recipe.findFirst({ where: { sourceUrl: url } });
      if (existing) {
        skipped++;
        continue;
      }
      const html = await fetchHtml(url);
      const parsed = parseRecipePage(html, url);
      if (!parsed) {
        skipped++;
        console.log(`[${i + 1}/${urls.length}] SKIP (no ingredients/steps): ${url}`);
      } else {
        const slug = await uniqueSlug(parsed.slug);
        await prisma.recipe.create({
          data: {
            slug,
            title: parsed.title,
            cuisine: "Mexican",
            imageUrl: parsed.imageUrl,
            videoUrl: parsed.videoUrl,
            ingredients: JSON.stringify(parsed.ingredients),
            steps: JSON.stringify(parsed.steps),
            sourceUrl: url,
            sourceName: SITE,
            popularity: 50,
          },
        });
        created++;
        if (created % 25 === 0) {
          console.log(`[${i + 1}/${urls.length}] ...${created} created so far`);
        }
      }
    } catch (err) {
      failed++;
      failedUrls.push(url);
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${i + 1}/${urls.length}] FAIL (${message}): ${url}`);
    }
    await sleep(DELAY_MS);
  }

  console.log("\n--- Done ---");
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  if (failedUrls.length > 0) {
    console.log("Failed URLs:");
    failedUrls.forEach((u) => console.log(`  ${u}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
