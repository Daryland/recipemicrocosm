import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { combinedRating } from "@/lib/rating";
import { DEVICE_COOKIE, deviceCookieOptions, newDeviceId, validDeviceId } from "@/lib/device";

const bodySchema = z.object({ value: z.number().int().min(1).max(5) });
const ratingSelect = { sourceRating: true, sourceRatingCount: true, siteRatingSum: true, siteRatingCount: true } as const;

function notFound(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2025");
}

// POST: set this device's 1-5 star rating, or change it if it already rated.
// Each device has one rating per recipe (unique recipeId + deviceId).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  const value = parsed.data.value;
  const existingId = validDeviceId(req.cookies.get(DEVICE_COOKIE)?.value);
  const deviceId = existingId ?? newDeviceId();

  const save = () =>
    prisma.$transaction(async (tx) => {
      const where = { recipeId_deviceId: { recipeId: params.id, deviceId } };
      const previous = await tx.recipeRating.findUnique({ where, select: { value: true } });
      if (previous) {
        await tx.recipeRating.update({ where, data: { value } });
      } else {
        await tx.recipeRating.create({ data: { recipeId: params.id, deviceId, value } });
      }
      return tx.recipe.update({
        where: { id: params.id },
        data: previous
          ? { siteRatingSum: { increment: value - previous.value } }
          : { siteRatingSum: { increment: value }, siteRatingCount: { increment: 1 } },
        select: ratingSelect,
      });
    });

  let recipe;
  try {
    recipe = await save();
  } catch (e) {
    // Two requests from the same device raced to create the rating; the retry
    // sees the first one and turns into a change instead of a second vote.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") recipe = await save();
    else if (notFound(e)) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
    else throw e;
  }

  const res = NextResponse.json({ ...combinedRating(recipe), yourRating: value });
  if (!existingId) res.cookies.set(DEVICE_COOKIE, deviceId, deviceCookieOptions);
  return res;
}

// DELETE: remove this device's rating so it can pick again (or not at all).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deviceId = validDeviceId(req.cookies.get(DEVICE_COOKIE)?.value);
  if (!deviceId) return NextResponse.json({ error: "You haven't rated this recipe." }, { status: 404 });

  try {
    const recipe = await prisma.$transaction(async (tx) => {
      const where = { recipeId_deviceId: { recipeId: params.id, deviceId } };
      const previous = await tx.recipeRating.findUnique({ where, select: { value: true } });
      if (!previous) return null;
      await tx.recipeRating.delete({ where });
      return tx.recipe.update({
        where: { id: params.id },
        data: { siteRatingSum: { decrement: previous.value }, siteRatingCount: { decrement: 1 } },
        select: ratingSelect,
      });
    });
    if (!recipe) return NextResponse.json({ error: "You haven't rated this recipe." }, { status: 404 });
    return NextResponse.json({ ...combinedRating(recipe), yourRating: null });
  } catch (e) {
    if (notFound(e)) return NextResponse.json({ error: "You haven't rated this recipe." }, { status: 404 });
    throw e;
  }
}
