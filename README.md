# Recipe MicroCosm

A personal recipe library: your own recipes plus anything pulled in from around the web, filtered by cuisine and A–Z, with no backstory filler — just ingredients, steps, and video when available.

## Stack

- **Next.js 14** (App Router, TypeScript) — one codebase for pages + API routes
- **Prisma** ORM — SQLite for local dev, swap to Postgres (Supabase/Neon) for production
- **Auth.js (NextAuth v4)** — Google, Apple, and email magic-link sign-in
- **Tailwind CSS** — warm "appetite" palette (ember red/orange, cream, gold)
- **cheerio** — reads each recipe page's schema.org `Recipe` JSON-LD (the structured data most recipe sites embed for Google), so imports pull only title/ingredients/steps/times/video — never the backstory

## Getting started

```bash
npm install
npx prisma db push      # creates prisma/dev.db from the schema
npm run db:seed         # adds 3 sample recipes so the UI isn't empty
npm run dev             # http://localhost:3000
```

Browsing, search, and filters work immediately. Signing in (to save recipes or add your own) needs at least one provider configured in `.env` — see `.env.example` for where to get each:

- **Google** — OAuth client at console.cloud.google.com
- **Apple** — Services ID + Sign in with Apple key (Apple Developer account required)
- **Email** — any SMTP server/app password

### Running on macOS

The commands above work as-is in Terminal.app, iTerm, etc. — this is a standard Node/Next.js project, nothing here is Windows-specific. A few Mac-only notes:

- **Node**: install via [nvm](https://github.com/nvm-sh/nvm) (`brew install nvm`) or `brew install node`. Any Node 18+ works. This is the only real prerequisite — everything else below comes from `npm install`.
- **git**: needed to clone the repo. Already present if you have Xcode Command Line Tools (see below); otherwise `brew install git`.
- **SQLite**: no separate install needed — Prisma bundles its own SQLite query engine, it doesn't rely on the system `sqlite3` binary. `npx prisma db push` and `npm run db:studio` work out of the box.
- **Native modules**: none of this project's dependencies need compiling, but if `npm install` ever fails trying to build something (a transitive dependency), run `xcode-select --install` once to get the Command Line Tools, then retry.
- **Quoting URLs**: macOS's default shell (zsh) treats `&` and `?` as special characters. Recipe URLs often contain `&` in a query string (tracking params, etc.), so when running the ingest script, quote each URL or the shell will silently truncate it at the `&`:

  ```bash
  npm run ingest -- "https://example.com/recipe?utm_source=x&ref=y"
  ```

## How recipe import works

All scraping goes through one function: `scrapeRecipeFromUrl()` in [`src/lib/scrape.ts`](src/lib/scrape.ts). Given a URL, it fetches the page and looks for a `schema.org/Recipe` JSON-LD block inside `<script type="application/ld+json">` tags — the same structured data recipe sites publish for Google's rich-result cards. That makes it reliable across most major sites without brittle per-site scraping rules (CSS selectors, site-specific parsers, etc.). If a page has no such block, or is missing ingredients/steps, it throws instead of falling back to scraping raw article text — which is where the backstory filler lives, and exactly what this app is designed to skip.

If the recipe schema includes a `video` (`VideoObject`), its URL is stored and embedded on the recipe page — YouTube links render as an embedded player, other direct video URLs render as an HTML5 `<video>` tag.

There are two ways to trigger it:

**1. From the web UI** — the normal path. `POST /api/scrape` ([`src/app/api/scrape/route.ts`](src/app/api/scrape/route.ts)) requires a signed-in session, calls `scrapeRecipeFromUrl()`, saves the result as a `Recipe` owned by that user, and logs the attempt in `ScrapeRequest` (success or failure) for later auditing.

**2. Directly from the codebase, via the CLI** — for bulk-importing a list of URLs without going through the browser or auth:

```bash
npm run ingest -- https://example.com/recipe-one https://example.com/recipe-two
```

This runs [`prisma/ingest-one.ts`](prisma/ingest-one.ts), which:

- takes one or more URLs as command-line args
- skips any URL already in the DB (matched by `sourceUrl`)
- calls the exact same `scrapeRecipeFromUrl()` used by the API route
- writes the recipe straight to the database with Prisma (no `ownerId` — these come in as unowned/library recipes, not tied to a signed-in user)
- prints one line per recipe (title, slug, ingredient/step counts) so you can see what came in

This is the quickest way to seed the library with a batch of recipes you already have links for, since it bypasses sign-in entirely and runs against your local `prisma/dev.db`.

## Data model

See `prisma/schema.prisma`. Key models: `User`/`Account`/`Session` (Auth.js), `Recipe` (ingredients/steps stored as JSON-encoded strings — SQLite has no native JSON column type), `SavedRecipe` (a user's personal library/favorites), `ScrapeRequest` (audit log of import attempts).

## Known follow-ups

- `popularity` on `Recipe` is a plain integer you can bump manually (e.g. via Prisma Studio: `npm run db:studio`) until real usage/view tracking is wired up.
- For production hosting on Vercel, switch `prisma/schema.prisma`'s datasource `provider` to `"postgresql"` and point `DATABASE_URL` at a hosted Postgres instance — Vercel's serverless functions don't have a persistent filesystem for SQLite.
- `next@14.2.35`'s own bundled `postcss@8.4.31` has a couple of known low-real-world-risk advisories (source-map path traversal) that only resolve via a Next 15/16 upgrade, which changes the `params`/`searchParams` API (they become async). Left on Next 14 for now since this app is small; revisit if upgrading.
