// Copies recipe photos into public/recipe-images as compressed WebP files so the
// site serves them itself. Safe to re-run: finished files and recipes are skipped.
//
//   node scripts/localize-images.js download [--limit=200]   fetch + compress
//   node scripts/localize-images.js apply                    point recipes at local files
//
// `apply` updates the database in .env, so deploy the files first. It saves the
// original URLs to backups/ before changing anything.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { PrismaClient } = require("@prisma/client");

const OUT_DIR = path.join(process.cwd(), "public", "recipe-images");
const PUBLIC_PREFIX = "/recipe-images/";
const FAILURES = path.join(process.cwd(), "scripts", "localize-failures.json");
const MAX_WIDTH = 1000;
const QUALITY = 68;
const TOTAL_CONCURRENCY = 12;
const PER_HOST_CONCURRENCY = 2;
const TIMEOUT_MS = 30000;
const USER_AGENT = "Mozilla/5.0 (compatible; RecipeMicroCosm image localizer)";

const fileNameFor = (url) => crypto.createHash("sha1").update(url).digest("hex").slice(0, 20) + ".webp";
const isRemote = (url) => /^https?:\/\//i.test(url || "");

async function fetchAndCompress(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
}

async function download(prisma, limit) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = await prisma.recipe.findMany({ select: { imageUrl: true } });
  let urls = [...new Set(rows.map((r) => r.imageUrl).filter(isRemote))];
  if (limit) {
    // Spread a sample evenly so it represents every source site.
    const step = Math.max(1, Math.floor(urls.length / limit));
    urls = urls.filter((_, i) => i % step === 0).slice(0, limit);
  }
  const queue = urls.filter((u) => !fs.existsSync(path.join(OUT_DIR, fileNameFor(u))));
  console.log(`${urls.length} photos, ${queue.length} to fetch`);

  const active = new Map();
  const failures = {};
  let done = 0;
  let bytes = 0;

  const takeNext = () => {
    const i = queue.findIndex((u) => (active.get(new URL(u).hostname) || 0) < PER_HOST_CONCURRENCY);
    return i === -1 ? null : queue.splice(i, 1)[0];
  };

  const worker = async () => {
    while (queue.length) {
      const url = takeNext();
      if (!url) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      const host = new URL(url).hostname;
      active.set(host, (active.get(host) || 0) + 1);
      try {
        const out = await fetchAndCompress(url);
        fs.writeFileSync(path.join(OUT_DIR, fileNameFor(url)), out);
        bytes += out.length;
      } catch (err) {
        failures[url] = String(err.message || err).slice(0, 200);
      }
      active.set(host, active.get(host) - 1);
      if (++done % 100 === 0) {
        console.log(`${done} done, ${Object.keys(failures).length} failed, ${(bytes / 1048576).toFixed(0)} MB`);
      }
    }
  };
  await Promise.all(Array.from({ length: TOTAL_CONCURRENCY }, worker));

  fs.writeFileSync(FAILURES, JSON.stringify(failures, null, 2));
  console.log(`FINISHED ${done} processed, ${Object.keys(failures).length} failed, ${(bytes / 1048576).toFixed(0)} MB this run`);
}

async function apply(prisma) {
  const rows = await prisma.recipe.findMany({ select: { id: true, imageUrl: true } });
  const remote = rows.filter((r) => isRemote(r.imageUrl));
  const ready = remote.filter((r) => fs.existsSync(path.join(OUT_DIR, fileNameFor(r.imageUrl))));

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(process.cwd(), "backups", `image-urls-${stamp}.json`);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, JSON.stringify(remote, null, 2));
  console.log(`Saved ${remote.length} original URLs to ${backup}`);

  for (let i = 0; i < ready.length; i += 200) {
    await prisma.$transaction(
      ready.slice(i, i + 200).map((r) =>
        prisma.recipe.update({
          where: { id: r.id },
          data: { imageUrl: PUBLIC_PREFIX + fileNameFor(r.imageUrl) },
        }),
      ),
    );
    console.log(`${Math.min(i + 200, ready.length)} / ${ready.length}`);
  }
  console.log(`FINISHED: ${ready.length} now local, ${remote.length - ready.length} left on their original URL`);
}

(async () => {
  const [command, ...args] = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const prisma = new PrismaClient();
  try {
    if (command === "download") await download(prisma, limitArg ? Number(limitArg.split("=")[1]) : 0);
    else if (command === "apply") await apply(prisma);
    else console.log("Usage: node scripts/localize-images.js download [--limit=N] | apply");
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
