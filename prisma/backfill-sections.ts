// Re-reads each recipe's source page and adds part headers ("For the dough:",
// "Make the sauce:") to recipes saved before the scraper kept them.
//   npx tsx prisma/backfill-sections.ts                  (dry run)
//   npx tsx prisma/backfill-sections.ts --write          (updates recipes)
//   npx tsx prisma/backfill-sections.ts --limit=20       (only the first 20 per site)
// Existing ingredient/step text is kept as-is; headers are only inserted when the
// page's item counts match exactly. Rick Bayless steps are re-read in full, since
// the old parser dropped numbered steps on some pages. Old values are saved to
// prisma/sections-backup.json before anything is written.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { scrapeRecipeFromUrl } from "../src/lib/scrape";
import { hasSectionHeaders, isSectionHeader } from "../src/lib/recipeSections";
import { parseRecipePage } from "./rickbayless-parse";

const prisma = new PrismaClient();
const write = process.argv.includes("--write");
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || Infinity;
const DELAY_MS = 400;
const BACKUP_FILE = "prisma/sections-backup.json";
// These sites block scripted requests now, or have no recipe markup to read sections from.
const SKIP_SITES = new Set(["thelemonbowl.com", "abrightmoment.com", "thechoppingblock.com"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Puts `withHeaders`' headers into `existing`, if both hold the same number of items. */
function mergeHeaders(existing: string[], withHeaders: string[]): string[] | undefined {
  if (hasSectionHeaders(existing) || !hasSectionHeaders(withHeaders)) return undefined;
  const items = withHeaders.filter((s) => !isSectionHeader(s));
  if (items.length !== existing.length) return undefined;
  const out: string[] = [];
  let i = 0;
  for (const s of withHeaders) out.push(isSectionHeader(s) ? s : existing[i++]);
  return out;
}

type Row = { id: string; slug: string; sourceUrl: string; sourceName: string; ingredients: string; steps: string };
type Change = { id: string; slug: string; ingredients?: string[]; steps?: string[] };

async function sectionsFor(r: Row): Promise<Change | undefined> {
  const oldIng: string[] = JSON.parse(r.ingredients);
  const oldSteps: string[] = JSON.parse(r.steps);
  const change: Change = { id: r.id, slug: r.slug };

  if (r.sourceName === "rickbayless.com") {
    const res = await fetch(r.sourceUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeMicroCosmBot/1.0; personal recipe library)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = parseRecipePage(await res.text(), r.sourceUrl);
    if (!parsed) return undefined;
    change.ingredients = mergeHeaders(oldIng, parsed.ingredients);
    const newCount = parsed.steps.filter((s) => !isSectionHeader(s)).length;
    if (newCount >= oldSteps.length && JSON.stringify(parsed.steps) !== r.steps) change.steps = parsed.steps;
  } else {
    const scraped = await scrapeRecipeFromUrl(r.sourceUrl);
    change.ingredients = mergeHeaders(oldIng, scraped.ingredients);
    change.steps = mergeHeaders(oldSteps, scraped.steps);
  }
  return change.ingredients || change.steps ? change : undefined;
}

async function runSite(rows: Row[], changes: Change[], stats: Record<string, number>) {
  for (const r of rows) {
    try {
      const c = await sectionsFor(r);
      if (c) {
        changes.push(c);
        stats.changed++;
        if (stats.changed <= 25 || !write) {
          const heads = [...(c.ingredients ?? []), ...(c.steps ?? [])].filter(isSectionHeader);
          console.log(`${write ? "update" : "would update"} ${r.slug}: ${heads.join(" | ").slice(0, 160)}`);
        }
        if (write) {
          const old = { id: r.id, slug: r.slug, ingredients: r.ingredients, steps: r.steps };
          fs.appendFileSync(BACKUP_FILE + "l", JSON.stringify(old) + "\n");
          await prisma.recipe.update({
            where: { id: r.id },
            data: {
              ...(c.ingredients && { ingredients: JSON.stringify(c.ingredients) }),
              ...(c.steps && { steps: JSON.stringify(c.steps) }),
            },
          });
        }
      }
    } catch (e) {
      stats.failed++;
      if (stats.failed <= 20) console.log(`failed ${r.slug}: ${(e as Error).message}`);
    }
    stats.done++;
    if (stats.done % 250 === 0) console.log(`… ${stats.done}/${stats.total} checked, ${stats.changed} with parts, ${stats.failed} failed`);
    await sleep(DELAY_MS);
  }
}

async function main() {
  const rows = (await prisma.recipe.findMany({
    where: { sourceUrl: { not: null }, sourceName: { not: null } },
    select: { id: true, slug: true, sourceUrl: true, sourceName: true, ingredients: true, steps: true },
    orderBy: { createdAt: "asc" },
  })) as Row[];

  const bySite = new Map<string, Row[]>();
  for (const r of rows) {
    if (SKIP_SITES.has(r.sourceName)) continue;
    const list = bySite.get(r.sourceName) ?? [];
    if (list.length < limit) list.push(r);
    bySite.set(r.sourceName, list);
  }

  const stats = { total: [...bySite.values()].reduce((n, l) => n + l.length, 0), done: 0, changed: 0, failed: 0 };
  const changes: Change[] = [];
  console.log(`Checking ${stats.total} recipes across ${bySite.size} sites${write ? "" : " (dry run)"}`);
  // One request at a time per site, sites in parallel.
  await Promise.all([...bySite.values()].map((list) => runSite(list, changes, stats)));

  if (write) {
    // Turn the line-per-recipe log into one JSON array for easy restoring.
    // Earlier runs' backups are kept, so the oldest saved value always wins on restore.
    if (fs.existsSync(BACKUP_FILE + "l")) {
      const earlier = fs.existsSync(BACKUP_FILE) ? JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) : [];
      const lines = fs.readFileSync(BACKUP_FILE + "l", "utf8").trim().split("\n");
      fs.writeFileSync(BACKUP_FILE, JSON.stringify([...earlier, ...lines.map((l) => JSON.parse(l))], null, 1));
      fs.unlinkSync(BACKUP_FILE + "l");
    }
  }
  console.log(`Done: ${stats.done} checked, ${stats.changed} ${write ? "updated" : "would update"}, ${stats.failed} failed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
