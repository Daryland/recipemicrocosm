import { PrismaClient } from "@prisma/client";
import { parseRecipePage } from "./rickbayless-parse";

const prisma = new PrismaClient();

const SITE = "rickbayless.com";
const SITEMAP_URL = "https://www.rickbayless.com/recipe-sitemap.xml";
const USER_AGENT =
  "Mozilla/5.0 (compatible; RecipeMicroCosmBot/1.0; personal recipe library)";
const DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
