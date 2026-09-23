// One-time copy of the local SQLite library (prisma/dev.db) into the Postgres
// database at DATABASE_URL. Run after `npx prisma db push`:
//   npm run db:copy-sqlite
// Safe to re-run: existing rows (same id) are skipped.
import { PrismaClient } from "@prisma/client";

// node:sqlite ships with Node 22+, but @types/node 20 has no declarations for it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require("node:sqlite");

const prisma = new PrismaClient();
const sqlite = new DatabaseSync("prisma/dev.db", { readOnly: true });

// Prisma's SQLite connector stores DateTime as epoch-ms integers and Boolean as 0/1.
const dateFields = ["createdAt", "updatedAt", "expires", "emailVerified"];
const boolFields = ["isPublic"];

function convert(row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row };
  for (const f of dateFields) {
    if (out[f] != null) out[f] = new Date(out[f] as number | string);
  }
  for (const f of boolFields) {
    if (out[f] != null) out[f] = Boolean(out[f]);
  }
  return out;
}

// Parents before children so foreign keys resolve.
const tables = [
  ["User", prisma.user],
  ["Account", prisma.account],
  ["Session", prisma.session],
  ["VerificationToken", prisma.verificationToken],
  ["Recipe", prisma.recipe],
  ["SavedRecipe", prisma.savedRecipe],
  ["ScrapeRequest", prisma.scrapeRequest],
] as const;

async function main() {
  for (const [table, delegate] of tables) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all().map(convert);
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (delegate as any).createMany({ data: chunk, skipDuplicates: true });
      inserted += res.count;
    }
    console.log(`${table}: ${rows.length} read, ${inserted} inserted`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
