import type { Metadata } from "next";
import Link from "next/link";
import { ContactDialog } from "@/components/ContactDialog";

export const metadata: Metadata = {
  title: "Copyright & Removal Requests · Recipe MicroCosm",
  description: "How recipes are credited on Recipe MicroCosm, and how to ask for a recipe or photo to be removed.",
};

const REMOVAL_TEMPLATE = `Recipe page on Recipe MicroCosm (link):

Original recipe or photo (link):

I am the owner / authorized to act for the owner: yes

What would you like us to do? (remove / change the credit / other):
`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 mt-10 text-xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

export default function CopyrightPage() {
  const contactEnabled = Boolean(process.env.CONTACT_EMAIL && process.env.EMAIL_SERVER && process.env.EMAIL_FROM);

  return (
    <article className="mx-auto max-w-2xl pb-8">
      <h1 className="text-4xl font-extrabold tracking-tightest">Copyright &amp; removal requests</h1>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-muted">
        Recipe MicroCosm collects recipes from around the web into one searchable library. Every recipe is credited
        to and links back to its original source, and we respect the work of the cooks, writers and photographers
        behind them.
      </p>

      <div className="mt-8 rounded border border-line-strong bg-white p-5">
        <p className="font-semibold text-ink">Own a recipe or photo here?</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Tell us and we&rsquo;ll remove it or fix the credit, no questions asked. We aim to act within a few days.
        </p>
        {contactEnabled ? (
          <ContactDialog
            triggerLabel="Request a removal"
            triggerClassName="btn-primary mt-4"
            title="Removal request"
            intro="Tell us which recipe or photo is yours and what you'd like us to do."
            messageTemplate={REMOVAL_TEMPLATE}
          />
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Use the contact link at the bottom of any page and include the details listed below.
          </p>
        )}
      </div>

      <Section title="What to include">
        <ul className="list-disc space-y-2 pl-5 marker:text-ink-faint">
          <li>The link to the recipe page on Recipe MicroCosm.</li>
          <li>The link to your original recipe or photo.</li>
          <li>Your name and how to reach you.</li>
          <li>Confirmation that you own the content or are authorized to act for the owner.</li>
        </ul>
        <p>
          That&rsquo;s all we need for an ordinary request. You don&rsquo;t need a lawyer or a formal notice.
        </p>
      </Section>

      <Section title="Formal copyright notices (DMCA)">
        <p>
          If you&rsquo;d rather send a formal notice under the U.S. Digital Millennium Copyright Act, send it the
          same way and include: your physical or electronic signature; identification of the copyrighted work; the
          link to the material on our site; your contact information; a statement that you have a good-faith belief
          the use isn&rsquo;t authorized by the owner, its agent or the law; and a statement, under penalty of
          perjury, that the information in your notice is accurate and that you&rsquo;re the owner or authorized to
          act for the owner.
        </p>
        <p>
          If something you added to your own library was removed and you believe that was a mistake, you can send a
          counter-notice the same way. Accounts that repeatedly add infringing content may be closed.
        </p>
      </Section>

      <Section title="How we credit recipes">
        <p>
          Each recipe page names its source and links to the original, so readers can find the full post, the
          author&rsquo;s notes and their other work. If a credit is wrong or missing, let us know and we&rsquo;ll fix
          it.
        </p>
        <p>
          See also our{" "}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
    </article>
  );
}
