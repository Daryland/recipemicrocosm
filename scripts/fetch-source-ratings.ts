// Backfills Recipe.sourceRating / sourceRatingCount from each recipe's source
// page (schema.org aggregateRating). Resumable: only checks recipes that have
// never been checked, and records misses so they aren't re-fetched.
//   npx tsx scripts/fetch-source-ratings.ts
import fs from "node:fs";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import { findRecipeNode, parseAggregateRating } from "../src/lib/scrape";

const prisma = new PrismaClient();
const CHECKED_FILE = "scripts/ratings-checked.json";
// These sites publish no ratings (spot-checked), so skip fetching them.
const NO_RATINGS = ["rickbayless.com"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";

async function ratingFor(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return undefined;
  const $ = cheerio.load(await res.text());
  let found: ReturnType<typeof parseAggregateRating>;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      found = parseAggregateRating(findRecipeNode(JSON.parse($(el).text()))?.aggregateRating);
    } catch {
      /* malformed JSON-LD */
    }
  });
  return found;
}

async function main() {
  const checked = new Set<string>(fs.existsSync(CHECKED_FILE) ? JSON.parse(fs.readFileSync(CHECKED_FILE, "utf8")) : []);
  const recipes = (
    await prisma.recipe.findMany({
      where: { sourceUrl: { not: null }, sourceRating: null },
      select: { id: true, sourceUrl: true },
    })
  ).filter((r) => !checked.has(r.id) && !NO_RATINGS.some((h) => r.sourceUrl!.includes(h)));
  console.log(`${recipes.length} recipes to check`);

  let found = 0;
  let done = 0;
  const queue = [...recipes];
  async function worker() {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try {
        const rating = await ratingFor(r.sourceUrl!);
        if (rating) {
          await prisma.recipe.update({
            where: { id: r.id },
            data: { sourceRating: rating.rating, sourceRatingCount: rating.count },
          });
          found++;
        }
        checked.add(r.id);
      } catch {
        /* network error: leave unchecked so a re-run retries it */
      }
      if (++done % 100 === 0) {
        fs.writeFileSync(CHECKED_FILE, JSON.stringify([...checked]));
        console.log(`${done}/${recipes.length} checked, ${found} with ratings`);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync(CHECKED_FILE, JSON.stringify([...checked]));
  console.log(`Done: ${done} checked, ${found} ratings saved.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
