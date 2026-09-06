import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: save (favorite) a recipe to the signed-in user's personal library
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to save recipes." }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  await prisma.savedRecipe.upsert({
    where: { userId_recipeId: { userId, recipeId: params.id } },
    create: { userId, recipeId: params.id },
    update: {},
  });

  return NextResponse.json({ saved: true });
}

// DELETE: remove a recipe from the signed-in user's personal library
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  await prisma.savedRecipe.deleteMany({
    where: { userId, recipeId: params.id },
  });

  return NextResponse.json({ saved: false });
}
