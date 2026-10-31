// Non-recipe pages that site search and the recipe finder chat can point to.

export interface SitePage {
  href: string;
  title: string;
  // Lowercase phrases a search can start with to find the page ("priv", "polic").
  // Avoid food words: "cookies" would catch every cookie recipe search.
  keywords: string[];
  // Whole-message match for the chat ("what do you do with my data?").
  chatPattern: RegExp;
  chatReply: string;
}

export const SITE_PAGES: SitePage[] = [
  {
    href: "/privacy",
    title: "Privacy Policy",
    keywords: ["privacy", "privacy policy", "policy", "personal data", "gdpr", "ccpa"],
    chatPattern:
      /\b(privacy|cookie (policy|settings|consent)|(use|uses|using|set|sets|store) cookies|personal (data|information|info)|my (data|information|info|email)|gdpr|ccpa|track(ing)? me|delete (my )?account|data (policy|protection|collection))\b/i,
    chatReply:
      "Our Privacy Policy explains what we collect, how it's used, and how to delete your account. You can open it below.",
  },
  {
    href: "/copyright",
    title: "Copyright & removal requests",
    keywords: ["copyright", "dmca", "takedown", "take down", "removal request", "remove my recipe", "request removal"],
    chatPattern:
      /\b(copyright|dmca|take ?down|remove my (recipe|photo|content)|(my|our) (recipe|photo)s? (is|are) on|request (a )?removal|stolen recipe)\b/i,
    chatReply:
      "If a recipe or photo here is yours, you can ask us to remove it or fix the credit. The details are on our copyright page below.",
  },
];

/** Pages with a keyword that starts with the search text ("priv" → Privacy Policy). Needs 4+ characters. */
export function matchSitePages(query: string): SitePage[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (q.length < 4) return [];
  return SITE_PAGES.filter((p) => p.keywords.some((k) => k.startsWith(q)));
}

/** The page a chat message is asking about, if any. */
export function chatSitePage(message: string): SitePage | undefined {
  return SITE_PAGES.find((p) => p.chatPattern.test(message));
}
