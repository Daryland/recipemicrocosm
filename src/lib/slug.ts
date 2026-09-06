import slugify from "slugify";
import { prisma } from "@/lib/prisma";

/** Generates a unique slug for a recipe title, appending -2, -3, ... on collision. */
export async function uniqueRecipeSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  let candidate = base;
  let suffix = 2;
  while (await prisma.recipe.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
