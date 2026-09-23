// Writes reviewed photos from scripts/image-candidates.json into the database.
//   npx tsx scripts/apply-images.ts            (dry run: shows what would change)
//   npx tsx scripts/apply-images.ts --write    (actually updates recipes)
// Recipe ids listed in scripts/rejected-images.json (a JSON array) are skipped.
// Only fills recipes whose imageUrl is still empty, so it never overwrites.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const write = process.argv.includes("--write");

type Candidate = { id: string; title: string; imageUrl?: string; method: string };

async function main() {
  const candidates: Candidate[] = JSON.parse(fs.readFileSync("scripts/image-candidates.json", "utf8"));
  const rejected = new Set<string>(
    fs.existsSync("scripts/rejected-images.json")
      ? JSON.parse(fs.readFileSync("scripts/rejected-images.json", "utf8"))
      : []
  );
  const approved = candidates.filter((c) => c.imageUrl && !rejected.has(c.id));

  let updated = 0;
  for (const c of approved) {
    if (!write) {
      console.log(`would set  ${c.title}`);
      continue;
    }
    const res = await prisma.recipe.updateMany({
      where: { id: c.id, OR: [{ imageUrl: null }, { imageUrl: "" }] },
      data: { imageUrl: c.imageUrl },
    });
    updated += res.count;
  }
  console.log(
    write
      ? `Updated ${updated} recipes (${rejected.size} rejected).`
      : `Dry run: ${approved.length} recipes would get photos (${rejected.size} rejected). Re-run with --write to apply.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
