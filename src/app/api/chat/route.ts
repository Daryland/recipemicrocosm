import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatBusyError, runRecipeChat } from "@/lib/recipeChat";

// Tool-calling rounds against a hosted model can outlast Vercel's default timeout.
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1000),
      })
    )
    .min(1)
    .max(40),
});

// POST /api/chat — recipe finder. Only the last few turns go to the model to
// keep small local models on track.
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a message of up to 1,000 characters." }, { status: 400 });
  }

  try {
    const result = await runRecipeChat(parsed.data.messages.slice(-8));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ChatBusyError) {
      return NextResponse.json(
        { error: "The recipe finder is busy right now. Try again in a moment." },
        { status: 429 }
      );
    }
    console.error("Recipe chat failed:", err);
    return NextResponse.json(
      { error: "The recipe finder isn't reachable right now. Check that Ollama is running." },
      { status: 503 }
    );
  }
}
