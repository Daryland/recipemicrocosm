import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { screenMessage } from "@/lib/contactScreen";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(5000),
  // Honeypot: hidden from people, so only bots fill it in.
  website: z.string().max(500).optional(),
  // Milliseconds between opening the form and sending; bots submit instantly.
  elapsedMs: z.coerce.number().int().nonnegative().optional(),
});

// Up to 5 messages per IP per hour. In-memory, so it resets on restart,
// which is plenty for keeping a bot from flooding the inbox.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recentSends = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const times = (recentSends.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) return true;
  recentSends.set(ip, [...times, now]);
  return false;
}

// POST: email a visitor's question to CONTACT_EMAIL, with Reply-To set to them.
export async function POST(req: NextRequest) {
  const { EMAIL_SERVER, EMAIL_FROM, CONTACT_EMAIL } = process.env;
  if (!EMAIL_SERVER || !EMAIL_FROM || !CONTACT_EMAIL) {
    return NextResponse.json({ error: "The contact form isn't set up yet." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in your name, a valid email and a message." }, { status: 400 });
  }
  const { name, email, message, website, elapsedMs } = parsed.data;
  // Pretend success to bots so they don't retry.
  if (website) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many messages — please try again later." }, { status: 429 });
  }

  const screen = await screenMessage({ name, email, message, elapsedMs });
  if (screen.verdict === "reject") return NextResponse.json({ error: screen.reason }, { status: 422 });
  if (screen.verdict === "drop") {
    console.warn(`Contact form: dropped message from ${email} (${screen.reason})`);
    return NextResponse.json({ ok: true });
  }

  try {
    await nodemailer.createTransport(EMAIL_SERVER).sendMail({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      replyTo: { name, address: email },
      subject: `Recipe MicroCosm: message from ${name}`,
      text: `${message}\n\n— ${name} <${email}>`,
    });
  } catch (e) {
    console.error("Contact email failed:", e);
    return NextResponse.json({ error: "Your message couldn't be sent. Please try again later." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
