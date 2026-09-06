import { PrismaClient } from "@prisma/client";
import { scrapeRecipeFromUrl } from "../src/lib/scrape";

const prisma = new PrismaClient();

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const urls = process.argv.slice(2);
  for (const url of urls) {
    const existing = await prisma.recipe.findFirst({ where: { sourceUrl: url } });
    if (existing) {
      console.log("Already exists:", url);
      continue;
    }
    const scraped = await scrapeRecipeFromUrl(url);
    const slug = await uniqueSlug(slugify(scraped.title));
    const sourceName = new URL(url).hostname.replace(/^www\./, "");
    const recipe = await prisma.recipe.create({
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
        sourceName,
        popularity: 50,
      },
    });
    console.log("Created:", recipe.title, "|", recipe.slug, "| ingredients:", scraped.ingredients.length, "| steps:", scraped.steps.length);
  }
}
main().finally(() => prisma.$disconnect());
