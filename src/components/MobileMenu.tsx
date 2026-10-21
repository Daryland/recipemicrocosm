"use client";

import { useEffect, useState } from "react";

// Hamburger button + slide-in panel that shows the sidebar on screens where it's hidden.
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open browse menu"
        aria-expanded={open}
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded text-ink hover:bg-line/60 lg:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Browse recipes">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div
            // Following any link in the menu closes it.
            onClickCapture={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-paper shadow-xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <span className="font-semibold">Browse</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close browse menu"
                className="-mr-2 rounded px-2 py-1 text-ink-faint hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
