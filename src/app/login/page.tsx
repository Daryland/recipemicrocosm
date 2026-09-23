"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="mb-2 text-4xl font-extrabold tracking-tightest">Sign in</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-muted">
        Create a free account to save recipes and build your own library.
      </p>

      <div className="space-y-3">
        <button onClick={() => signIn("google")} className="btn-secondary w-full">
          Continue with Google
        </button>
        <button onClick={() => signIn("apple")} className="btn-secondary w-full">
          Continue with Apple
        </button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
        <div className="h-px flex-1 bg-line" />
        or
        <div className="h-px flex-1 bg-line" />
      </div>

      {sent ? (
        <p className="text-sm text-basil-600">Check your inbox for a sign-in link.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn("email", { email, redirect: false });
            setSent(true);
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="field h-10 flex-1"
          />
          <button type="submit" className="btn-primary">
            Email me a link
          </button>
        </form>
      )}
    </div>
  );
}
