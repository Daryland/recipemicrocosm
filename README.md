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

## How recipe import works

`POST /api/scrape` (`src/app/api/scrape/route.ts` + `src/lib/scrape.ts`) fetches the given URL and looks for a `schema.org/Recipe` JSON-LD block in the page `<script type="application/ld+json">` tags. That's the same structured data recipe sites publish for Google's rich-result cards, so it's reliable across most major sites without brittle per-site scraping rules. If a page has no such block, the import fails with a clear error instead of scraping raw article text (which is where the backstory filler lives).

If the recipe schema includes a `video` (`VideoObject`), its URL is stored and embedded on the recipe page — YouTube links render as an embedded player, other direct video URLs render as an HTML5 `<video>` tag.

## Data model

See `prisma/schema.prisma`. Key models: `User`/`Account`/`Session` (Auth.js), `Recipe` (ingredients/steps stored as JSON-encoded strings — SQLite has no native JSON column type), `SavedRecipe` (a user's personal library/favorites), `ScrapeRequest` (audit log of import attempts).

## Known follow-ups

- `popularity` on `Recipe` is a plain integer you can bump manually (e.g. via Prisma Studio: `npm run db:studio`) until real usage/view tracking is wired up.
- For production hosting on Vercel, switch `prisma/schema.prisma`'s datasource `provider` to `"postgresql"` and point `DATABASE_URL` at a hosted Postgres instance — Vercel's serverless functions don't have a persistent filesystem for SQLite.
- `next@14.2.35`'s own bundled `postcss@8.4.31` has a couple of known low-real-world-risk advisories (source-map path traversal) that only resolve via a Next 15/16 upgrade, which changes the `params`/`searchParams` API (they become async). Left on Next 14 for now since this app is small; revisit if upgrading.
