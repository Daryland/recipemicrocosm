"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChatRecipe } from "@/lib/recipeChat";

interface Message {
  role: "user" | "assistant";
  content: string;
  recipes?: ChatRecipe[];
  error?: boolean;
}

const EXAMPLES = ["Something quick with chicken", "A chocolate dessert", "What can I make with leftover rice?"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The recipe finder didn't respond.");
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply || "I couldn't find anything for that. Try different ingredients or a dish name.",
          recipes: data.recipes,
        },
      ]);
    } catch (err) {
      setMessages([
        ...next,
        { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <section
          aria-label="Recipe finder"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="fixed inset-x-4 bottom-20 z-40 flex max-h-[min(36rem,calc(100vh-7rem))] flex-col overflow-hidden rounded border border-line-strong bg-white shadow-[0_16px_48px_-12px_rgba(27,33,29,0.25)] sm:left-auto sm:right-6 sm:w-[24rem]"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">Recipe finder</h2>
              <p className="text-xs text-ink-muted">Searches recipes in this library</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close recipe finder"
              className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:bg-line/60 hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-ink-muted">
                  Tell me what you feel like cooking and I&apos;ll find it in the library.
                </p>
                <div className="mt-3 flex flex-col items-start gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      className="rounded border border-line px-2.5 py-1.5 text-left text-sm text-ink transition-colors hover:border-ink"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="ml-auto w-fit max-w-[85%] rounded bg-ink px-3 py-2 text-sm text-paper">
                  {m.content}
                </p>
              ) : (
                <div key={i} className="max-w-[92%]">
                  <p className={`whitespace-pre-line text-sm leading-relaxed ${m.error ? "text-tomato-600" : "text-ink"}`}>
                    {m.content}
                  </p>
                  {m.recipes && m.recipes.length > 0 && (
                    <ul className="mt-2 divide-y divide-line rounded border border-line">
                      {m.recipes.map((r) => (
                        <li key={r.slug}>
                          <Link
                            href={`/recipes/${r.slug}`}
                            className="group flex items-baseline justify-between gap-3 px-3 py-2 hover:bg-paper"
                          >
                            <span className="text-sm font-semibold group-hover:underline group-hover:decoration-tomato-500 group-hover:decoration-2 group-hover:underline-offset-4">
                              {r.title}
                            </span>
                            {r.totalTime && (
                              <span className="shrink-0 text-xs tabular-nums text-ink-muted">{r.totalTime} min</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            )}

            {loading && <p className="animate-pulse text-sm text-ink-muted">Searching the library…</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <label htmlFor="chat-input" className="sr-only">
              Ask about a recipe
            </label>
            <input
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              autoComplete="off"
              placeholder="Ask about a recipe"
              className="field h-10 flex-1"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary h-10">
              Send
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-paper shadow-[0_8px_24px_-8px_rgba(27,33,29,0.4)] transition-colors hover:bg-ink/90 sm:right-6"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {open ? "Close" : "Find a recipe"}
      </button>
    </>
  );
}
