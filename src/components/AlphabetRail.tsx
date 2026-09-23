import Link from "next/link";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphabetRail() {
  return (
    <aside className="hidden w-11 shrink-0 border-l border-line py-6 lg:block" aria-label="Browse by letter">
      <div className="sticky top-24 flex flex-col items-center">
        {ALPHABET.map((letter) => (
          <Link
            key={letter}
            href={`/recipes?letter=${letter}`}
            className="flex h-6 w-7 items-center justify-center rounded text-xs font-semibold text-ink-faint transition-colors hover:bg-ink hover:text-paper"
          >
            {letter}
          </Link>
        ))}
      </div>
    </aside>
  );
}
