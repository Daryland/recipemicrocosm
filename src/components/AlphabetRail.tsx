import Link from "next/link";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function AlphabetRail() {
  return (
    <aside className="hidden w-12 shrink-0 border-l border-ember-100 bg-white/60 py-6 lg:block">
      <div className="sticky top-24 flex flex-col items-center gap-0.5">
        {ALPHABET.map((letter) => (
          <Link
            key={letter}
            href={`/recipes?letter=${letter}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium hover:bg-ember-100"
          >
            {letter}
          </Link>
        ))}
      </div>
    </aside>
  );
}
