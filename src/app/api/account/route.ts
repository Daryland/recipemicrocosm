import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Permanently deletes the signed-in user's account.
//
// Removed: the user, their saved-recipe list, sign-in records, and any private
// recipes they added. Public recipes they imported stay on the site with no owner
// (Recipe.owner is onDelete: SetNull), and ratings aren't tied to accounts.

const schema = z.object({
  // Password accounts confirm with their password; email-link accounts by typing their email.
  password: z.string().max(200).optional(),
  confirmEmail: z.string().max(254).optional(),
});

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ ok: true }); // Already gone.

  if (user.passwordHash) {
    if (!parsed.data.password || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "That password isn't right." }, { status: 403 });
    }
  } else if (!user.email || parsed.data.confirmEmail?.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Type your email address exactly to confirm." }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.recipe.deleteMany({ where: { ownerId: userId, isPublic: false } }),
    ...(user.email ? [prisma.verificationToken.deleteMany({ where: { identifier: user.email } })] : []),
    // Cascades to sign-in accounts, sessions and saved recipes.
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
