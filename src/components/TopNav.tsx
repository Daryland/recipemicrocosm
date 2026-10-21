"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { RecipeSearch } from "@/components/RecipeSearch";
import { MobileMenu } from "@/components/MobileMenu";

// `mobileMenu` is the sidebar, passed in from the layout so it can stay a server component.
export function TopNav({ mobileMenu }: { mobileMenu?: React.ReactNode }) {
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-paper/90 px-5 backdrop-blur sm:px-8">
      {mobileMenu && <MobileMenu>{mobileMenu}</MobileMenu>}
      <Link href="/" className="whitespace-nowrap text-lg font-extrabold tracking-tightest text-ink">
        Recipe MicroCosm<span className="text-tomato-500">.</span>
      </Link>

      <div className="ml-4 hidden max-w-md flex-1 sm:flex">
        <RecipeSearch />
      </div>

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
