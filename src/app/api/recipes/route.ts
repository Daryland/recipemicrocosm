import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueRecipeSlug } from "@/lib/slug";
import { encodeStringList } from "@/lib/recipeJson";

// GET /api/recipes?cuisine=Italian&letter=A&q=chicken
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cuisine = searchParams.get("cuisine") ?? undefined;
  const letter = searchParams.get("letter") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const recipes = await prisma.recipe.findMany({
    where: {
      isPublic: true,
      ...(cuisine ? { cuisine } : {}),
      // SQLite's default text comparison is already case-insensitive for ASCII,
      // so no `mode: "insensitive"` here (that option is Postgres-only in Prisma).
      ...(letter ? { title: { startsWith: letter } } : {}),
      ...(q ? { title: { contains: q } } : {}),
    },
    orderBy: [{ popularity: "desc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      cuisine: true,
      imageUrl: true,
      totalTime: true,
      popularity: true,
    },
  });

  return NextResponse.json({ recipes });
}

const createSchema = z.object({
  title: z.string().min(1),
  cuisine: z.string().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1),
  prepTime: z.number().int().positive().optional(),
  cookTime: z.number().int().positive().optional(),
  totalTime: z.number().int().positive().optional(),
  servings: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// POST /api/recipes — create a recipe by hand (paste/copy-in) for the signed-in user
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add recipes." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const data = parsed.data;
  const slug = await uniqueRecipeSlug(data.title);

  const recipe = await prisma.recipe.create({
    data: {
      ...data,
      ingredients: encodeStringList(data.ingredients),
      steps: encodeStringList(data.steps),
      slug,
      ownerId: userId,
    },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
