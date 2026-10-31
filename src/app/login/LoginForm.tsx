"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

interface LoginFormProps {
  callbackUrl: string;
  initialMode: Mode;
  providers: { email: boolean };
  authError?: string;
}

// NextAuth error codes that can land on /login?error=...
const AUTH_ERRORS: Record<string, string> = {
  EmailSignin: "We couldn't send the sign-in email. Try again or use a password.",
  Verification: "That sign-in link has expired or was already used.",
  CredentialsSignin: "Wrong email or password.",
};

const MIN_PASSWORD = 8;

export function LoginForm({ callbackUrl, initialMode, providers, authError }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(authError ? AUTH_ERRORS[authError] ?? "Sign-in failed. Try again." : null);
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (signup && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Couldn't create your account. Try again.");
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError(AUTH_ERRORS.CredentialsSignin);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendLink() {
    setError(null);
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    const result = await signIn("email", { email, callbackUrl, redirect: false });
    setBusy(false);
    if (result?.error) setError(AUTH_ERRORS.EmailSignin);
    else setLinkSent(true);
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="mb-2 text-4xl font-extrabold tracking-tightest">{signup ? "Create account" : "Sign in"}</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-muted">
        {signup
          ? "A free account lets you save recipes and build your own library."
          : "Welcome back. Sign in to see your saved recipes."}
      </p>


      {linkSent ? (
        <p className="text-sm text-basil-600">Check your inbox for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {signup && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                Name <span className="font-normal text-ink-faint">(optional)</span>
              </span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field h-10"
                maxLength={80}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field h-10"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Password</span>
            <input
              type="password"
              required
              minLength={signup ? MIN_PASSWORD : undefined}
              autoComplete={signup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field h-10"
            />
            {signup && <span className="mt-1 block text-xs text-ink-faint">At least {MIN_PASSWORD} characters.</span>}
          </label>

          {error && (
            <p role="alert" className="text-sm text-tomato-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "One moment…" : signup ? "Create account" : "Sign in"}
          </button>

          {!signup && providers.email && (
            <button type="button" onClick={sendLink} disabled={busy} className="btn-secondary w-full">
              Email me a sign-in link instead
            </button>
          )}
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-muted">
        {signup ? "Already have an account? " : "New here? "}
        <button
          type="button"
          onClick={() => switchMode(signup ? "signin" : "signup")}
          className="font-semibold text-ink underline underline-offset-4"
        >
          {signup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
