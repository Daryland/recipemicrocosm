import Link from "next/link";
import { ContactDialog } from "@/components/ContactDialog";

export function SiteFooter() {
  // The "Get in touch" form only shows once email sending is configured in .env.
  const contactEnabled = Boolean(process.env.CONTACT_EMAIL && process.env.EMAIL_SERVER && process.env.EMAIL_FROM);

  return (
    <footer className="border-t border-line px-5 py-10 sm:px-8">
      <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
        <div className="max-w-sm">
          <Link href="/" className="text-lg font-extrabold tracking-tightest text-ink">
            Recipe MicroCosm<span className="text-tomato-500">.</span>
          </Link>
          <p className="mt-2 text-sm text-ink-muted">
            A personal recipe library — just the recipes, no backstory.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">Contact</h2>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            Found a broken recipe, have a suggestion, or want to share a favorite?
          </p>
          {contactEnabled && <ContactDialog />}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-6 text-xs text-ink-faint">
        <span>© {new Date().getFullYear()} Recipe MicroCosm</span>
        <span>Recipes credited to their original sources.</span>
      </div>
    </footer>
  );
}
