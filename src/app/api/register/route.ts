import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/password";

// Creates an email + password account. The client signs in with the
// "credentials" provider right after (see src/app/login/LoginForm.tsx).

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Enter a valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Never attach a password to an account someone else may own; they sign in the way they signed up.
    return NextResponse.json(
      {
        error: existing.passwordHash
          ? "An account with that email already exists. Sign in instead."
          : "That email already has an account that signs in with an email link.",
      },
      { status: 409 }
    );
  }

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name || null,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
