"use client";

import { useEffect, useId, useRef } from "react";
import { SUPPORT_URL } from "@/lib/support";

// "Support this site" prompt. Worded as a tip, not a charitable donation (the site
// isn't a nonprofit), and nothing is promised in return. It opens by itself once,
// after a visitor has been browsing a while; after that only from the footer button.

const AUTO_OPEN_AFTER_MS = 45_000;
const DISMISSED_KEY = "support-prompt-dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Storage blocked (private mode, etc.): treat as dismissed so it never nags.
    return true;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Ignore: worst case the prompt can open once more on a later visit.
  }
}

export function SupportDialog({ autoOpen = false }: { autoOpen?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener("close", rememberDismissed);
    if (!autoOpen || readDismissed()) return () => dialog.removeEventListener("close", rememberDismissed);
    const timer = setTimeout(() => {
      // Don't cover another open dialog (contact form, mobile menu sheet, etc.).
      if (!document.querySelector("dialog[open]")) dialog.showModal();
    }, AUTO_OPEN_AFTER_MS);
    return () => {
      clearTimeout(timer);
      dialog.removeEventListener("close", rememberDismissed);
    };
  }, [autoOpen]);

  if (!SUPPORT_URL) return null;

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="btn-secondary mt-4">
        Support this site
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="w-[calc(100%-2rem)] max-w-sm rounded-lg border border-line bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
        aria-labelledby={titleId}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-bold">
              Help keep Recipe MicroCosm free
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-mr-2 -mt-1 rounded px-2 py-1 text-ink-faint transition-colors hover:text-ink"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            This site has no ads and no paywall. If it&rsquo;s saved you time in the kitchen, you can chip in toward
            hosting costs with a one-off tip.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            Tips are entirely optional, aren&rsquo;t a charitable donation or tax-deductible, and don&rsquo;t unlock
            anything. Payment is handled by Buy Me a Coffee; we never see your card details.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className="btn-secondary">
              Maybe later
            </button>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dialogRef.current?.close()}
              className="btn-primary"
            >
              Buy me a coffee
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
