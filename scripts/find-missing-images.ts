// Finds photos for recipes that have no imageUrl. Writes candidates to
// scripts/image-candidates.json for review — does NOT touch the database.
//   npx tsx scripts/find-missing-images.ts
//
// 1. Re-checks the recipe's own source page (JSON-LD / og:image) in case the
//    original scrape missed it.
// 2. Otherwise checks candidate pages for the same recipe on other sites
//    (scripts/search-urls.json, { recipeId: [urls] }) and only accepts a page
//    whose recipe matches ours on BOTH title and ingredients.
// Recipes still without a match are listed in scripts/still-missing.json.
import fs from "node:fs";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OUT = "scripts/image-candidates.json";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";

const SKIP_HOSTS = [
  "rickbayless.com", "youtube.com", "pinterest.", "facebook.com", "instagram.com",
  "reddit.com", "amazon.", "tiktok.com", "x.com", "twitter.com", "wikipedia.org",
  "yelp.com", "tripadvisor.", "ckbk.com", // ckbk serves cookbook covers, not dish photos
];
const MIN_WIDTH = 700;

const STOP = new Set(
  ("a an and or of the with for in on to from de del la las el los y con en al " +
    "recipe recipes style easy best homemade simple aka quick classic mexican").split(" ")
);
const INGREDIENT_NOISE = new Set(
  ("cup cups tablespoon tablespoons teaspoon teaspoons tbsp tsp ounce ounces oz pound pounds lb lbs " +
    "gram grams kg ml liter quart pint pinch dash large medium small whole fresh freshly dried ground " +
    "chopped minced sliced diced finely coarsely roughly thinly cut into pieces about plus more divided " +
    "optional taste needed peeled seeded stemmed halved quartered packed softened melted room temperature " +
    "inch inches cm can cans package good quality such as preferably store bought homemade for serving garnish " +
    "salt water").split(" ")
);

function words(s: string, stop: Set<string>) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .map((w) => w.replace(/(es|s)$/, ""));
}

// "Masa Dumplings (Chochoyotes)" -> ["Masa Dumplings", "Chochoyotes"]
function titleParts(title: string) {
  const m = title.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? [m[1], m[2]] : [title];
}

function titleScore(ours: string, theirs: string) {
  const theirWords = new Set(words(theirs, STOP));
  // Best of the English or Spanish half of our title.
  return Math.max(
    ...titleParts(ours).map((part) => {
      const w = [...new Set(words(part, STOP))];
      return w.length ? w.filter((x) => theirWords.has(x)).length / w.length : 0;
    })
  );
}

// Fraction of our (salient) ingredient lines that also appear in their list.
function ingredientScore(ours: string[], theirs: string[]) {
  const theirWords = new Set(theirs.flatMap((l) => words(l, INGREDIENT_NOISE)));
  const lines = ours.map((l) => words(l, INGREDIENT_NOISE)).filter((w) => w.length);
  if (!lines.length || !theirWords.size) return 0;
  return lines.filter((w) => w.some((x) => theirWords.has(x))).length / lines.length;
}

async function get(url: string, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, signal: ctrl.signal, redirect: "follow" });
    return res;
  } finally {
    clearTimeout(t);
  }
}

type Img = { url: string; width?: number };
type PageRecipe = { name?: string; ingredients: string[]; images: Img[]; mentionsBayless: boolean };

function toImgs(v: unknown): Img[] {
  if (!v) return [];
  if (typeof v === "string") return [{ url: v }];
  if (Array.isArray(v)) return v.flatMap(toImgs);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const url = (o.url ?? o.contentUrl) as string | undefined;
    return url ? [{ url, width: Number(o.width) || undefined }] : [];
  }
  return [];
}

function findRecipeNode(node: unknown): Record<string, unknown> | undefined {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipeNode(n);
      if (r) return r;
    }
    return;
  }
  const o = node as Record<string, unknown>;
  const type = o["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return o;
  return findRecipeNode(o["@graph"]);
}

async function readPage(url: string): Promise<PageRecipe | undefined> {
  let html: string;
  try {
    const res = await get(url);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return;
    html = await res.text();
  } catch {
    return;
  }
  const $ = cheerio.load(html);
  let recipe: Record<string, unknown> | undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipe) return;
    try {
      recipe = findRecipeNode(JSON.parse($(el).text()));
    } catch {
      /* malformed JSON-LD */
    }
  });
  const og = $('meta[property="og:image"]').attr("content");
  const ogWidth = Number($('meta[property="og:image:width"]').attr("content")) || undefined;
  const images = [...toImgs(recipe?.image), ...(og ? [{ url: og, width: ogWidth }] : [])].filter(
    (i) => /^https?:\/\//.test(i.url) && !/logo|placeholder|default|avatar|icon/i.test(i.url)
  );
  return {
    name: (recipe?.name as string) ?? $("h1").first().text().trim(),
    ingredients: ((recipe?.recipeIngredient as string[]) ?? []).map(String),
    images,
    mentionsBayless: /bayless/i.test(html),
  };
}

// Prefer the widest known image; unknown widths keep their original order.
function bestImage(images: Img[]) {
  return [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
}

// Reads pixel dimensions from a JPEG/PNG/WebP/GIF header.
function imageSize(b: Buffer): { width: number; height: number } | undefined {
  if (b.length < 30) return;
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.toString("ascii", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
    return;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      // SOF0..SOF15, excluding DHT (C4), JPG (C8), DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
}

// Returns the image's dimensions if it loads and is large enough to look sharp.
async function checkImage(url: string) {
  try {
    const res = await get(url, 20000);
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return;
    const size = imageSize(Buffer.from(await res.arrayBuffer()));
    if (!size || size.width < MIN_WIDTH) return;
    return size;
  } catch {
    return;
  }
}

// Search results gathered separately (web search), keyed by recipe id.
const URLS_FILE = "scripts/search-urls.json";
const searchUrls: Record<string, string[]> = fs.existsSync(URLS_FILE)
  ? JSON.parse(fs.readFileSync(URLS_FILE, "utf8"))
  : {};

type Candidate = {
  id: string;
  title: string;
  sourceName: string | null;
  method: "source" | "search" | "none";
  imageUrl?: string;
  width?: number;
  height?: number;
  pageUrl?: string;
  pageTitle?: string;
  titleScore?: number;
  ingredientScore?: number;
  mentionsBayless?: boolean;
};

async function findForRecipe(r: { id: string; title: string; sourceUrl: string | null; sourceName: string | null; ingredients: string }): Promise<Candidate> {
  const base = { id: r.id, title: r.title, sourceName: r.sourceName };
  let ours: string[] = [];
  try {
    ours = JSON.parse(r.ingredients);
  } catch {
    /* leave empty */
  }

  // 1. The recipe's own page.
  if (r.sourceUrl && !r.sourceUrl.includes("rickbayless.com")) {
    const page = await readPage(r.sourceUrl);
    const img = page && bestImage(page.images);
    const size = img && (await checkImage(img.url));
    if (img && size) {
      return { ...base, method: "source", imageUrl: img.url, width: size.width, height: size.height, pageUrl: r.sourceUrl, pageTitle: page!.name };
    }
  }

  // 2. Same recipe on other sites, from the gathered search results.
  let best: Candidate | undefined;
  let bestScore = 0;
  const urls = (searchUrls[r.id] ?? []).filter((u) => !SKIP_HOSTS.some((h) => u.includes(h)));
  for (const url of urls) {
    const page = await readPage(url);
    if (!page || !page.images.length || !page.ingredients.length) continue;
    const ts = titleScore(r.title, page.name ?? "");
    const is = ingredientScore(ours, page.ingredients);
    if (ts < 0.5 || is < 0.5) continue;
    const score = ts + is + (page.mentionsBayless && r.sourceName?.includes("rickbayless") ? 0.3 : 0);
    if (score <= bestScore) continue;
    const img = bestImage(page.images);
    const size = await checkImage(img.url);
    if (!size) continue;
    bestScore = score;
    best = {
      ...base,
      method: "search",
      imageUrl: img.url,
      width: size.width,
      height: size.height,
      pageUrl: url,
      pageTitle: page.name,
      titleScore: +ts.toFixed(2),
      ingredientScore: +is.toFixed(2),
      mentionsBayless: page.mentionsBayless,
    };
  }
  return best ?? { ...base, method: "none" };
}

// Windows can briefly lock a file an editor or virus scanner is reading.
function writeWithRetry(file: string, data: string, tries = 5) {
  for (let i = 1; ; i++) {
    try {
      return fs.writeFileSync(file, data);
    } catch (e) {
      if (i >= tries) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500 * i);
    }
  }
}

async function main() {
  const done: Record<string, Candidate> = fs.existsSync(OUT)
    ? Object.fromEntries((JSON.parse(fs.readFileSync(OUT, "utf8")) as Candidate[]).map((c) => [c.id, c]))
    : {};
  const missing = await prisma.recipe.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: "" }] },
    select: { id: true, title: true, sourceUrl: true, sourceName: true, ingredients: true },
    orderBy: { title: "asc" },
  });
  // Re-check recipes that had no match last time (new search URLs may exist).
  const todo = missing.filter((r) => !done[r.id] || done[r.id].method === "none").slice(0, Number(process.env.LIMIT) || undefined);
  console.log(`${missing.length} missing images, ${todo.length} still to search`);

  let i = 0;
  for (const r of todo) {
    i++;
    const c = await findForRecipe(r);
    done[r.id] = c;
    // Save as we go so the run can be resumed.
    writeWithRetry(OUT, JSON.stringify(Object.values(done), null, 2));
    console.log(`[${i}/${todo.length}] ${c.method.padEnd(6)} ${r.title}${c.pageUrl ? `  <- ${new URL(c.pageUrl).hostname}` : ""}`);
  }
  const all = Object.values(done);
  writeWithRetry(
    "scripts/still-missing.json",
    JSON.stringify(all.filter((c) => c.method === "none").map((c) => ({ id: c.id, title: c.title, sourceName: c.sourceName })), null, 2)
  );
  console.log(
    `\nsource: ${all.filter((c) => c.method === "source").length}, search: ${all.filter((c) => c.method === "search").length}, none: ${all.filter((c) => c.method === "none").length}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
