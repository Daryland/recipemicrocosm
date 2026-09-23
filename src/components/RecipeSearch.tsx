"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  id: string;
  slug: string;
  title: string;
  cuisine: string | null;
}

// Bold the part of the title that matches what was typed.
function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-ink">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export function RecipeSearch({
  size = "sm",
  placeholder = "Search recipes",
}: {
  size?: "sm" | "lg";
  placeholder?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const wrapperRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Debounced fetch; aborts the previous request so stale results never land.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipes/suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: { suggestions: Suggestion[] } = await res.json();
        setSuggestions(data.suggestions);
        setActive(-1);
      } catch {
        // Aborted or offline — keep whatever was showing.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function goToRecipe(s: Suggestion) {
    setOpen(false);
    setQuery("");
    router.push(`/recipes/${s.slug}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (open && active >= 0 && suggestions[active]) {
      goToRecipe(suggestions[active]);
      return;
    }
    setOpen(false);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/recipes?${params.toString()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && query.trim() !== "" && suggestions.length > 0;
  const lg = size === "lg";

  return (
    <form ref={wrapperRef} onSubmit={handleSubmit} role="search" className="relative flex flex-1 gap-2">
      <label htmlFor={inputId} className="sr-only">
        Search recipes
      </label>
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`field flex-1 bg-white ${lg ? "h-12 text-base" : "h-9"}`}
      />
      {lg && (
        <button type="submit" className="btn-primary h-12 px-6">
          Search
        </button>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded border border-line-strong bg-white py-1 shadow-[0_8px_24px_-8px_rgba(27,33,29,0.18)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => goToRecipe(s)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-4 px-3 ${
                lg ? "py-2.5 text-base" : "py-2 text-sm"
              } ${i === active ? "bg-paper" : ""}`}
            >
              <span className="truncate text-ink-muted">
                <Highlight text={s.title} query={query.trim()} />
              </span>
              {s.cuisine && <span className="shrink-0 text-xs text-ink-faint">{s.cuisine}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
