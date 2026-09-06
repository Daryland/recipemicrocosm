"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export function TopNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/recipes?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ember-100 bg-cream/95 px-6 py-4 backdrop-blur">
      <Link href="/" className="font-display text-xl font-bold text-ember-600 whitespace-nowrap">
        Recipe MicroCosm
      </Link>

      <form onSubmit={handleSearch} className="ml-2 flex-1 max-w-xl">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes…"
          className="w-full rounded-full border border-ember-100 bg-white px-4 py-2 text-sm shadow-sm focus:border-ember-500 focus:outline-none"
        />
      </form>

      <nav className="ml-auto flex items-center gap-3 text-sm">
        <Link href="/recipes" className="pill hover:bg-ember-50">
          Browse
        </Link>
        {status === "authenticated" ? (
          <>
            <Link href="/account" className="pill hover:bg-ember-50">
              My Library
            </Link>
            <button onClick={() => signOut()} className="btn-secondary">
              Sign out
            </button>
          </>
        ) : (
          <button onClick={() => signIn()} className="btn-primary">
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}
