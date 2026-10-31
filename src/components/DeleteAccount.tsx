"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// "Delete account" on the My library page. Asks for the password (or, for
// email-link accounts, the email address) before calling DELETE /api/account.
export function DeleteAccount({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasPassword ? { password: confirm } : { confirmEmail: confirm }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't delete your account. Try again.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-tomato-600 hover:border-tomato-600">
        Delete my account
      </button>
    );
  }

  return (
    <form onSubmit={remove} className="max-w-md space-y-3 rounded border border-tomato-500/40 bg-tomato-50 p-4">
      <p className="text-sm font-semibold text-ink">Delete your account permanently?</p>
      <p className="text-sm leading-relaxed text-ink-muted">
        This removes your account, your saved recipes list, and any private recipes you added. Public recipes you
        imported stay on the site. This can&rsquo;t be undone.
      </p>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">
          {hasPassword ? "Enter your password to confirm" : `Type ${email} to confirm`}
        </span>
        <input
          type={hasPassword ? "password" : "email"}
          autoComplete={hasPassword ? "current-password" : "off"}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field h-10"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-tomato-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !confirm} className="btn-primary bg-tomato-600 hover:bg-tomato-500">
          {busy ? "Deleting…" : "Delete account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setError(null);
          }}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
