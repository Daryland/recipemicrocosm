import { PrismaClient } from "@prisma/client";
import { scrapeRecipeFromUrl } from "../src/lib/scrape";

const prisma = new PrismaClient();

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const DELAY_MS = 350;

const ALCOHOL_TITLE_RE =
  /\b(margarita|cocktail|sangria|mojito|daiquiri|spritz|martini|cosmopolitan|negroni|moscow mule|shandy|paloma|michelada|sidecar|highball|bellini|hurricane cocktail|salty dog|greyhound cocktail|seabreeze)\b/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getPostUrls(sitemapUrl: string): Promise<string[]> {
  const xml = await fetchText(sitemapUrl);
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const sitemapUrl = process.argv[2];
  const siteName = process.argv[3];
  if (!sitemapUrl || !siteName) {
    console.error("Usage: tsx scrape-site.ts <sitemapUrl> <siteName>");
    process.exit(1);
  }

  console.log(`Fetching sitemap: ${sitemapUrl}`);
  let urls = await getPostUrls(sitemapUrl);
  console.log(`Found ${urls.length} post URLs.`);
  const limit = process.env.SCRAPE_LIMIT ? Number(process.env.SCRAPE_LIMIT) : undefined;
  if (limit) urls = urls.slice(0, limit);

  let created = 0;
  let skipped = 0;
  let alcoholSkipped = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const existing = await prisma.recipe.findFirst({ where: { sourceUrl: url } });
      if (existing) {
        skipped++;
        continue;
      }

      const scraped = await scrapeRecipeFromUrl(url);

      if (ALCOHOL_TITLE_RE.test(scraped.title)) {
        alcoholSkipped++;
        console.log(`[${i + 1}/${urls.length}] SKIP (alcoholic drink): ${scraped.title}`);
        await sleep(DELAY_MS);
        continue;
      }

      const slug = await uniqueSlug(slugify(scraped.title));

      await prisma.recipe.create({
        data: {
          slug,
          title: scraped.title,
          cuisine: scraped.cuisine ?? null,
          imageUrl: scraped.imageUrl,
          videoUrl: scraped.videoUrl,
          ingredients: JSON.stringify(scraped.ingredients),
          steps: JSON.stringify(scraped.steps),
          prepTime: scraped.prepTime,
          cookTime: scraped.cookTime,
          totalTime: scraped.totalTime,
          servings: scraped.servings,
          sourceUrl: url,
          sourceName: siteName,
          popularity: 50,
        },
      });
      created++;
      if (created % 25 === 0) {
        console.log(`[${i + 1}/${urls.length}] ...${created} created so far`);
      }
    } catch (err) {
      skipped++;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${i + 1}/${urls.length}] SKIP (${message}): ${url}`);
    }
    await sleep(DELAY_MS);
  }

  console.log("\n--- Done ---");
  console.log(`Created: ${created}`);
  console.log(`Skipped (non-recipe/error/dup): ${skipped}`);
  console.log(`Skipped (alcoholic drink): ${alcoholSkipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
