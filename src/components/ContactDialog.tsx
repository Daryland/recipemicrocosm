"use client";

import { useEffect, useId, useRef, useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

interface ContactDialogProps {
  // What the opening button says and looks like; defaults to the footer's "Get in touch".
  triggerLabel?: string;
  triggerClassName?: string;
  title?: string;
  intro?: string;
  // Starting text for the message box, e.g. a removal-request template.
  messageTemplate?: string;
}

export function ContactDialog({
  triggerLabel = "Get in touch",
  triggerClassName = "btn-secondary mt-4",
  title = "Get in touch",
  intro = "Ask a question, report a broken recipe, or share a favorite.",
  messageTemplate,
}: ContactDialogProps = {}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Several dialogs can be on one page (footer + removal request), so ids must be unique.
  const titleId = useId();
  // When the form was opened; the server drops messages sent implausibly fast.
  const openedAt = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // <dialog> handles Esc, focus trapping and the backdrop; reset the form once it closes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setStatus("idle");
      setError("");
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), elapsedMs: Date.now() - openedAt.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Your message couldn't be sent.");
      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your message couldn't be sent.");
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openedAt.current = Date.now();
          dialogRef.current?.showModal();
        }}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
        aria-labelledby={titleId}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-bold">
              {title}
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

          {status === "sent" ? (
            <div className="mt-4">
              <p className="text-sm text-ink-muted">Thanks — your message is on its way. I&apos;ll reply by email.</p>
              <button type="button" onClick={() => dialogRef.current?.close()} className="btn-primary mt-6">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <p className="text-sm text-ink-muted">{intro}</p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Name</span>
                <input name="name" required maxLength={100} autoComplete="name" className="field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Email</span>
                <input name="email" type="email" required maxLength={200} autoComplete="email" className="field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Message</span>
                <textarea
                  name="message"
                  required
                  maxLength={5000}
                  rows={messageTemplate ? 8 : 5}
                  defaultValue={messageTemplate}
                  className="field resize-y"
                />
              </label>
              {/* Honeypot for bots; kept off-screen and out of the tab order. */}
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              {status === "error" && <p className="text-sm text-tomato-500">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => dialogRef.current?.close()} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={status === "sending"} className="btn-primary">
                  {status === "sending" ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
