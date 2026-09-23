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

// Matches Tailwind's `sm` breakpoint: below it the chat is a full-screen sheet.
const MOBILE_QUERY = "(max-width: 639px)";

function isMobile() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    // On phones, focusing would pop the keyboard over the conversation.
    if (!isMobile()) inputRef.current?.focus();
    // Full-screen on phones: stop the page behind from scrolling.
    if (isMobile()) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  function minimize() {
    setOpen(false);
  }

  function close() {
    setOpen(false);
    setMessages([]);
    setInput("");
  }

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

  const inProgress = messages.length > 0;

  return (
    <>
      {open && (
        <section
          aria-label="Recipe finder"
          onKeyDown={(e) => e.key === "Escape" && minimize()}
          className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-20 sm:right-6 sm:z-40 sm:h-auto sm:max-h-[min(36rem,calc(100vh-7rem))] sm:w-[24rem] sm:rounded sm:border sm:border-line-strong sm:shadow-[0_16px_48px_-12px_rgba(27,33,29,0.25)]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <h2 className="text-base font-bold sm:text-sm">Recipe finder</h2>
              <p className="text-sm text-ink-muted sm:text-xs">Searches recipes in this library</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={minimize}
                aria-label="Minimize recipe finder"
                title="Minimize"
                className="flex h-10 w-10 items-center justify-center rounded text-ink-muted hover:bg-line/60 hover:text-ink sm:h-8 sm:w-8"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 10.5h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={close}
                aria-label="Close recipe finder and clear the conversation"
                title="Close"
                className="flex h-10 w-10 items-center justify-center rounded text-ink-muted hover:bg-line/60 hover:text-ink sm:h-8 sm:w-8"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:space-y-4 sm:py-4"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div>
                <p className="text-base leading-relaxed text-ink-muted sm:text-sm">
                  Tell me what you feel like cooking and I&apos;ll find it in the library.
                </p>
                <div className="mt-4 flex flex-col items-start gap-2 sm:mt-3 sm:gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      className="rounded border border-line px-3 py-2 text-left text-base text-ink transition-colors hover:border-ink sm:px-2.5 sm:py-1.5 sm:text-sm"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <p
                  key={i}
                  className="ml-auto w-fit max-w-[85%] rounded bg-ink px-3.5 py-2.5 text-base leading-snug text-paper sm:px-3 sm:py-2 sm:text-sm"
                >
                  {m.content}
                </p>
              ) : (
                <div key={i} className="sm:max-w-[92%]">
                  <p
                    className={`whitespace-pre-line text-base leading-relaxed sm:text-sm ${
                      m.error ? "text-tomato-600" : "text-ink"
                    }`}
                  >
                    {m.content}
                  </p>
                  {m.recipes && m.recipes.length > 0 && (
                    <ul className="mt-3 divide-y divide-line rounded border border-line sm:mt-2">
                      {m.recipes.map((r) => (
                        <li key={r.slug}>
                          <Link
                            href={`/recipes/${r.slug}`}
                            onClick={() => isMobile() && minimize()}
                            className="group flex items-baseline justify-between gap-3 px-3 py-3 hover:bg-paper sm:py-2"
                          >
                            <span className="text-base font-semibold leading-snug group-hover:underline group-hover:decoration-tomato-500 group-hover:decoration-2 group-hover:underline-offset-4 sm:text-sm">
                              {r.title}
                            </span>
                            {r.totalTime && (
                              <span className="shrink-0 text-sm tabular-nums text-ink-muted sm:text-xs">
                                {r.totalTime} min
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            )}

            {loading && <p className="animate-pulse text-base text-ink-muted sm:text-sm">Searching the library…</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
              enterKeyHint="send"
              placeholder="Ask about a recipe"
              className="field h-11 flex-1 text-base sm:h-10 sm:text-sm"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary h-11 sm:h-10">
              Send
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 h-12 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-paper shadow-[0_8px_24px_-8px_rgba(27,33,29,0.4)] transition-colors hover:bg-ink/90 sm:right-6 ${
          open ? "hidden sm:inline-flex" : "inline-flex"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {open ? "Minimize" : inProgress ? "Continue chat" : "Find a recipe"}
        {!open && inProgress && <span className="h-2 w-2 rounded-full bg-tomato-500" aria-hidden="true" />}
      </button>
    </>
  );
}
