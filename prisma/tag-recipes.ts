import { PrismaClient } from "@prisma/client";
import { originFor, tagRecipe } from "../src/lib/taxonomy";

// Recomputes the sidebar tags and origin for every recipe from src/lib/taxonomy.ts.
// Usage: npm run db:tag            (writes changes)
//        npm run db:tag -- --dry   (only reports what would change)

const prisma = new PrismaClient();
const BATCH = 100;

async function main() {
  const dry = process.argv.includes("--dry");
  const recipes = await prisma.recipe.findMany({
    select: { id: true, title: true, ingredients: true, cuisine: true, tags: true, origin: true },
  });

  const updates: { id: string; tags: string[]; origin: string | null }[] = [];
  for (const r of recipes) {
    let ingredients: string[] = [];
    try {
      ingredients = JSON.parse(r.ingredients);
    } catch {
      // Malformed ingredient JSON: tag from the title alone.
    }
    const tags = tagRecipe(r.title, ingredients, r.cuisine).sort();
    const origin = originFor(r.cuisine);
    if (tags.join() !== [...r.tags].sort().join() || origin !== r.origin) updates.push({ id: r.id, tags, origin });
  }

  console.log(`${recipes.length} recipes, ${updates.length} to update${dry ? " (dry run)" : ""}`);
  if (dry) return;

  for (let i = 0; i < updates.length; i += BATCH) {
    await prisma.$transaction(
      updates.slice(i, i + BATCH).map((u) => prisma.recipe.update({ where: { id: u.id }, data: { tags: u.tags, origin: u.origin } }))
    );
    console.log(`  ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
