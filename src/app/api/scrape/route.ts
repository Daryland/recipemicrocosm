import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeRecipeFromUrl } from "@/lib/scrape";
import { uniqueRecipeSlug } from "@/lib/slug";
import { encodeStringList } from "@/lib/recipeJson";

const bodySchema = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add recipes." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
  }
  const { url } = parsed.data;
  const userId = (session.user as { id: string }).id;

  const request = await prisma.scrapeRequest.create({
    data: { url, userId, status: "pending" },
  });

  try {
    const scraped = await scrapeRecipeFromUrl(url);
    const slug = await uniqueRecipeSlug(scraped.title);

    const recipe = await prisma.recipe.create({
      data: {
        slug,
        title: scraped.title,
        cuisine: scraped.cuisine,
        imageUrl: scraped.imageUrl,
        videoUrl: scraped.videoUrl,
        ingredients: encodeStringList(scraped.ingredients),
        steps: encodeStringList(scraped.steps),
        prepTime: scraped.prepTime,
        cookTime: scraped.cookTime,
        totalTime: scraped.totalTime,
        servings: scraped.servings,
        sourceUrl: scraped.sourceUrl,
        sourceName: scraped.sourceName,
        ownerId: userId,
      },
    });

    await prisma.scrapeRequest.update({
      where: { id: request.id },
      data: { status: "success", recipeId: recipe.id },
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed.";
    await prisma.scrapeRequest.update({
      where: { id: request.id },
      data: { status: "failed", error: message },
    });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
