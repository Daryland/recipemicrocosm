import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Recipe MicroCosm",
  description: "What Recipe MicroCosm collects, how it's used, and the choices you have.",
};

// Keep this in step with the app: update it whenever a feature starts collecting
// something new or a new service provider is added.
const EFFECTIVE_DATE = "October 31, 2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 mt-10 text-xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-ink-faint">{children}</ul>;
}

const CONTENTS = [
  ["summary", "The short version"],
  ["collect", "What we collect"],
  ["cookies", "Cookies and local storage"],
  ["use", "How we use information"],
  ["share", "Who we share it with"],
  ["retention", "How long we keep it"],
  ["rights", "Your choices and rights"],
  ["security", "Security"],
  ["children", "Children"],
  ["other", "Other things to know"],
  ["contact", "Contact us"],
] as const;

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl pb-8">
      <h1 className="text-4xl font-extrabold tracking-tightest">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-faint">Effective {EFFECTIVE_DATE}</p>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-muted">
        Recipe MicroCosm (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a recipe library website. This policy explains what
        information we collect when you use the site, why, who helps us run it, and how you can see, change or
        delete your information.
      </p>

      <nav aria-label="On this page" className="mt-8 rounded border border-line bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">On this page</p>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {CONTENTS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-ink hover:underline hover:decoration-tomato-500 hover:underline-offset-4">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="summary" title="The short version">
        <List>
          <li>You can browse, search and rate recipes without an account.</li>
          <li>
            If you create an account, we store your email address, an optional name, and a securely hashed version
            of your password, plus the recipes you save or add.
          </li>
          <li>We don&rsquo;t sell your information, show ads, or use advertising or cross-site tracking cookies.</li>
          <li>
            You can delete your account at any time from{" "}
            <Link href="/account" className="font-semibold text-ink underline underline-offset-4">
              My library
            </Link>
            .
          </li>
        </List>
      </Section>

      <Section id="collect" title="What we collect">
        <p>
          <strong>Account information.</strong> When you sign up we collect your email address, the name you
          choose to give (optional), and your password. Passwords are stored only as a one-way scrypt hash; we
          can&rsquo;t see or recover them. If you sign in with an emailed link, we briefly store a one-time sign-in
          token.
        </p>
        <p>
          <strong>Your library.</strong> The recipes you save, recipes you add or paste in, and the web addresses of
          recipes you ask us to import, along with whether each import succeeded.
        </p>
        <p>
          <strong>Recipe ratings.</strong> When you rate a recipe we store the star rating with a random device ID
          kept in a cookie, so you can change your rating later and each device counts once. Ratings aren&rsquo;t
          linked to your account, name or email.
        </p>
        <p>
          <strong>Messages you send us.</strong> If you use the &ldquo;Get in touch&rdquo; form, we receive your
          name, email address and message by email so we can reply. To block spam and harmful links, any web
          addresses in your message are checked against Cloudflare&rsquo;s family-safe DNS service and VirusTotal
          (only the domain names are sent, not your message or contact details). We use your IP address briefly,
          in memory, to limit how many messages can be sent in an hour.
        </p>
        <p>
          <strong>Recipe finder chat.</strong> What you type into the recipe finder is sent to our AI model
          provider (Ollama) to generate a reply, together with the last few messages of the conversation. We
          don&rsquo;t save chat conversations to your account or our database, and closing the chat clears it from
          your screen. Please don&rsquo;t enter personal or sensitive information in the chat.
        </p>
        <p>
          <strong>Support payments.</strong> If you choose to leave a tip, you do it on Buy Me a Coffee&rsquo;s
          website, not ours. We never receive your card or bank details. Buy Me a Coffee may share with us the
          name, email address and message you give them, under their own privacy policy.
        </p>
        <p>
          <strong>Searches.</strong> Search text is used to show results and suggestions. We don&rsquo;t save your
          searches or link them to your account.
        </p>
        <p>
          <strong>Usage and device information.</strong> We use Vercel Web Analytics to understand which pages are
          visited. It collects aggregated information such as the page viewed, referring site, browser, operating
          system, device type and country, and it doesn&rsquo;t use cookies or identify you across websites. Like
          most websites, our hosting provider also processes technical information such as IP addresses and
          request logs to deliver pages and keep the service secure.
        </p>
      </Section>

      <Section id="cookies" title="Cookies and local storage">
        <p>We only use cookies and storage needed for the site to work:</p>
        <List>
          <li>
            <strong>Sign-in cookies</strong> (set by our sign-in system, named <code>next-auth.*</code>) keep you
            signed in and protect forms against cross-site request forgery. They&rsquo;re removed when you sign out
            or when they expire.
          </li>
          <li>
            <strong>Device cookie</strong> (<code>rmc_device</code>), a random ID set the first time you rate a
            recipe, kept for up to two years.
          </li>
          <li>
            <strong>Local storage</strong> remembers display preferences, such as how the recipe list is laid out.
            It stays in your browser and isn&rsquo;t sent to us.
          </li>
        </List>
        <p>
          You can clear or block cookies in your browser settings. If you do, you&rsquo;ll be signed out and your
          ratings will count as coming from a new device.
        </p>
      </Section>

      <Section id="use" title="How we use information">
        <List>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To show, save and organize recipes in your library.</li>
          <li>To count recipe ratings fairly.</li>
          <li>To answer messages you send us.</li>
          <li>To run the recipe finder and search.</li>
          <li>To understand how the site is used, fix problems, and prevent spam and abuse.</li>
          <li>To comply with the law and protect the rights and safety of our users and the site.</li>
        </List>
        <p>
          Where privacy laws such as the GDPR apply, we rely on these legal bases: providing the service you asked
          for (your account and library), our legitimate interests in running, improving and securing the site
          (analytics, ratings, spam prevention), and legal obligations where they apply.
        </p>
      </Section>

      <Section id="share" title="Who we share it with">
        <p>
          We don&rsquo;t sell or rent your personal information, and we don&rsquo;t share it for advertising. We
          share it only with service providers that help us run the site, under their own privacy and security
          terms:
        </p>
        <List>
          <li>
            <strong>Vercel</strong> &ndash; website hosting and Web Analytics.
          </li>
          <li>
            <strong>Neon</strong> &ndash; database hosting for accounts, libraries and recipes.
          </li>
          <li>
            <strong>Resend</strong> &ndash; sending sign-in and contact-form emails.
          </li>
          <li>
            <strong>Ollama</strong> &ndash; the AI model behind the recipe finder chat.
          </li>
          <li>
            <strong>Buy Me a Coffee</strong> &ndash; optional tips, processed on their platform. We receive no
            payment details.
          </li>
          <li>
            <strong>Cloudflare</strong> and <strong>VirusTotal</strong> &ndash; checking links in contact-form
            messages for malware and phishing.
          </li>
        </List>
        <p>
          We may also disclose information if required by law, to protect against fraud or abuse, or as part of a
          merger or transfer of the site, in which case this policy would continue to apply to your information.
        </p>
      </Section>

      <Section id="retention" title="How long we keep it">
        <List>
          <li>Account and library information is kept until you delete your account.</li>
          <li>Emailed sign-in tokens expire within 24 hours.</li>
          <li>Ratings are kept to keep recipe scores accurate; they aren&rsquo;t tied to your identity.</li>
          <li>Contact-form emails are kept only as long as needed to handle your message.</li>
          <li>
            Deleted information may remain in our providers&rsquo; short-term backups for a limited time before
            it&rsquo;s overwritten.
          </li>
        </List>
      </Section>

      <Section id="rights" title="Your choices and rights">
        <List>
          <li>
            <strong>Delete your account</strong> any time from{" "}
            <Link href="/account" className="font-semibold text-ink underline underline-offset-4">
              My library
            </Link>
            . This removes your account, your saved recipes list, and any private recipes you added. Public
            recipes you imported stay on the site without being linked to you.
          </li>
          <li>
            <strong>See or correct your information.</strong> Your saved and added recipes are shown in My library.
            For a copy of your data or other corrections, contact us.
          </li>
          <li>
            <strong>Privacy laws.</strong> Depending on where you live (for example, in the EU, UK or California),
            you may have the right to access, correct, delete or receive a copy of your personal information, to
            object to or restrict some uses of it, and to complain to your local data protection authority. We
            don&rsquo;t sell or &ldquo;share&rdquo; personal information as those terms are defined under
            California law. We won&rsquo;t treat you differently for using these rights.
          </li>
        </List>
        <p>We aim to respond to privacy requests within 30 days.</p>
      </Section>

      <Section id="security" title="Security">
        <p>
          We protect your information with encrypted connections (HTTPS), hashed passwords, and sign-in cookies
          that scripts on the page can&rsquo;t read. No website can guarantee perfect security, so please use a
          password you don&rsquo;t use anywhere else.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          Recipe MicroCosm isn&rsquo;t directed to children under 13, and we don&rsquo;t knowingly collect personal
          information from them. If you believe a child has created an account, contact us and we&rsquo;ll delete
          it.
        </p>
      </Section>

      <Section id="other" title="Other things to know">
        <p>
          <strong>Other websites.</strong> Recipes are credited to and link back to their original sources. Those
          sites have their own privacy policies, which apply when you visit them.
        </p>
        <p>
          <strong>Copyright.</strong> To ask for a recipe or photo to be removed, see{" "}
          <Link href="/copyright" className="font-semibold text-ink underline underline-offset-4">
            Copyright &amp; removal requests
          </Link>
          .
        </p>
        <p>
          <strong>Where data is processed.</strong> Our service providers may process information in the United
          States and other countries, which may have different data protection laws from where you live.
        </p>
        <p>
          <strong>Changes to this policy.</strong> If we change this policy, we&rsquo;ll update the effective date
          above, and for significant changes we&rsquo;ll give notice on the site.
        </p>
      </Section>

      <Section id="contact" title="Contact us">
        <p>
          For privacy questions or requests, use the &ldquo;Get in touch&rdquo; link at the bottom of any page and
          mention &ldquo;Privacy&rdquo; in your message.
        </p>
      </Section>
    </article>
  );
}
