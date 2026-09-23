import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_SUGGESTIONS = 5;

const select = { id: true, slug: true, title: true, cuisine: true } as const;

// GET /api/recipes/suggest?q=chi — up to 5 title matches for the search box.
// Titles that start with the query rank above ones that merely contain it.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ suggestions: [] });

  const orderBy = [{ popularity: "desc" as const }, { title: "asc" as const }];

  const prefix = await prisma.recipe.findMany({
    where: { isPublic: true, title: { startsWith: q, mode: "insensitive" } },
    orderBy,
    take: MAX_SUGGESTIONS,
    select,
  });

  const remaining = MAX_SUGGESTIONS - prefix.length;
  const contains =
    remaining > 0
      ? await prisma.recipe.findMany({
          where: {
            isPublic: true,
            title: { contains: q, mode: "insensitive" },
            id: { notIn: prefix.map((r) => r.id) },
          },
          orderBy,
          take: remaining,
          select,
        })
      : [];

  return NextResponse.json({ suggestions: [...prefix, ...contains] });
}
