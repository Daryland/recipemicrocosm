"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export function TopNav() {
  const { status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/recipes?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-paper/90 px-5 backdrop-blur sm:px-8">
      <Link href="/" className="whitespace-nowrap text-lg font-extrabold tracking-tightest text-ink">
        Recipe MicroCosm<span className="text-tomato-500">.</span>
      </Link>

      <form onSubmit={handleSearch} className="ml-4 hidden max-w-md flex-1 sm:block" role="search">
        <label htmlFor="nav-search" className="sr-only">
          Search recipes
        </label>
        <input
          id="nav-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes"
          className="field h-9 bg-white"
        />
      </form>

      <nav className="ml-auto flex items-center gap-1">
        <Link href="/recipes" className="nav-link">
          Browse
        </Link>
        {status === "authenticated" ? (
          <>
            <Link href="/account" className="nav-link">
              My library
            </Link>
            <button onClick={() => signOut()} className="nav-link">
              Sign out
            </button>
          </>
        ) : (
          <button onClick={() => signIn()} className="btn-primary ml-2 h-9">
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}
