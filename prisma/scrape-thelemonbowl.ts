import { PrismaClient } from "@prisma/client";
import { scrapeRecipeFromUrl } from "../src/lib/scrape";

const prisma = new PrismaClient();

const SITE = "thelemonbowl.com";
const SITEMAP_URLS = [
  "https://thelemonbowl.com/post-sitemap.xml",
  "https://thelemonbowl.com/post-sitemap2.xml",
];
const USER_AGENT =
  "Mozilla/5.0 (compatible; RecipeMicroCosmBot/1.0; personal recipe library)";
const DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getPostUrls(): Promise<string[]> {
  const all: string[] = [];
  for (const sitemapUrl of SITEMAP_URLS) {
    const xml = await fetchText(sitemapUrl);
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    all.push(...urls);
  }
  return all;
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
  console.log("Fetching post sitemaps...");
  let urls = await getPostUrls();
  console.log(`Found ${urls.length} post URLs.`);
  const limit = process.env.SCRAPE_LIMIT ? Number(process.env.SCRAPE_LIMIT) : undefined;
  if (limit) urls = urls.slice(0, limit);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const existing = await prisma.recipe.findFirst({ where: { sourceUrl: url } });
      if (existing) {
        skipped++;
        continue;
      }

      const scraped = await scrapeRecipeFromUrl(url);
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
          sourceName: SITE,
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
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
