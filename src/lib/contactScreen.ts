// Screens contact-form messages before they're emailed: bots, sales pitches,
// and links to malware, phishing or adult sites.

export type ScreenResult =
  | { verdict: "ok" }
  // Shown to the sender so a real person can fix their message.
  | { verdict: "reject"; reason: string }
  // Silently discarded (the sender sees "sent") so bots and spammers don't adapt.
  | { verdict: "drop"; reason: string };

// People take more than a few seconds to fill in name, email and a message.
const MIN_FILL_MS = 3000;
const MAX_LINKS = 3;

// Phrases typical of cold sales outreach. Two or more hits = sales pitch.
const SALES_PATTERNS = [
  /\bseo\b/i,
  /\bbacklinks?\b/i,
  /\bguest posts?\b/i,
  /\bsponsored (post|article|content)\b/i,
  /\blink (building|insertion|exchange)\b/i,
  /\b(first|top) page of google\b/i,
  /\bdomain authority\b/i,
  /\b(web|website|app) (design|development|redesign)\b/i,
  /\bdigital marketing\b/i,
  /\bsocial media (marketing|management)\b/i,
  /\blead generation\b/i,
  /\b(more|increase|boost|drive) (traffic|sales|leads|revenue)\b/i,
  /\bgrow your (business|brand|audience)\b/i,
  /\b(our|my) (services|agency|team of experts)\b/i,
  /\b(affordable|competitive) (price|pricing|rates?)\b/i,
  /\bfree (quote|consultation|audit|trial)\b/i,
  /\b(schedule|book) a (call|demo|meeting)\b/i,
  /\bpartnership opportunit(y|ies)\b/i,
  /\b(crypto|bitcoin|forex|investment opportunit(y|ies))\b/i,
  /\b(loan|funding|cash advance) (offer|approval)\b/i,
  /\bunsubscribe\b/i,
  /\bwhatsapp\b/i,
];

// Full URLs, plus bare domains like "example.com/page" that spammers use to dodge link filters.
const LINK_PATTERN =
  /\b(?:https?:\/\/)?((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,24}))(?::\d+)?(?:[/?#][^\s<>"]*)?/gi;
// "example dot com" / "example[.]com" style obfuscation.
const OBFUSCATED_LINK = /\b[a-z0-9-]+\s*(?:\[\.\]|\(\.\)|\s(?:dot|\[dot\]|\(dot\))\s)\s*(?:com|net|org|io|co|xyz|info|biz|ru|top)\b/i;

export function extractDomains(text: string): string[] {
  const domains = new Set<string>();
  for (const match of text.matchAll(LINK_PATTERN)) {
    const domain = match[1].toLowerCase().replace(/^www\./, "");
    // Skip things like "e.g" / "i.e" and version numbers; a real TLD has letters only.
    if (/\.[a-z]{2,24}$/.test(domain)) domains.add(domain);
  }
  return [...domains];
}

// Cloudflare's family resolver answers 0.0.0.0 for domains it classifies as
// malware or adult content. Free, no key needed.
async function blockedByCloudflareFamily(domain: string): Promise<boolean> {
  const res = await fetch(`https://family.cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Cloudflare DNS ${res.status}`);
  const data = (await res.json()) as { Answer?: { data: string }[] };
  return (data.Answer ?? []).some((a) => a.data === "0.0.0.0");
}

// Optional second opinion from VirusTotal's 70+ security vendors when
// VIRUSTOTAL_API_KEY is set. Free keys allow 4 lookups/minute, 500/day.
async function flaggedByVirusTotal(domain: string, apiKey: string): Promise<boolean> {
  const res = await fetch(`https://www.virustotal.com/api/v3/domains/${encodeURIComponent(domain)}`, {
    headers: { "x-apikey": apiKey },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return false; // VirusTotal has never seen it.
  if (!res.ok) throw new Error(`VirusTotal ${res.status}`);
  const data = (await res.json()) as {
    data?: { attributes?: { last_analysis_stats?: { malicious?: number; suspicious?: number } } };
  };
  const stats = data.data?.attributes?.last_analysis_stats ?? {};
  return (stats.malicious ?? 0) >= 1 || (stats.suspicious ?? 0) >= 2;
}

export async function screenMessage(input: {
  name: string;
  email: string;
  message: string;
  elapsedMs?: number;
}): Promise<ScreenResult> {
  const { name, message, elapsedMs } = input;
  const text = `${name}\n${message}`;

  if (elapsedMs === undefined || elapsedMs < MIN_FILL_MS) {
    return { verdict: "drop", reason: `submitted too fast (${elapsedMs ?? "no"} ms)` };
  }

  const salesHits = SALES_PATTERNS.filter((p) => p.test(text)).length;
  if (salesHits >= 2) return { verdict: "drop", reason: `sales pitch (${salesHits} phrases)` };

  const domains = extractDomains(text);
  if (domains.length > MAX_LINKS) return { verdict: "drop", reason: `${domains.length} links` };
  if (OBFUSCATED_LINK.test(message)) {
    return { verdict: "reject", reason: "Please don't include disguised links in your message." };
  }
  if (domains.length === 0) return { verdict: "ok" };

  const vtKey = process.env.VIRUSTOTAL_API_KEY;
  try {
    for (const domain of domains) {
      const blocked =
        (await blockedByCloudflareFamily(domain)) || (vtKey ? await flaggedByVirusTotal(domain, vtKey) : false);
      if (blocked) {
        console.warn(`Contact form: blocked link to ${domain}`);
        return { verdict: "reject", reason: "Your message links to a site that isn't allowed. Please remove the link." };
      }
    }
  } catch (e) {
    // Fail closed: if a link can't be checked, it doesn't get through.
    console.error("Contact form: link check failed:", e);
    return {
      verdict: "reject",
      reason: "We couldn't check the links in your message. Please remove them or try again later.",
    };
  }
  return { verdict: "ok" };
}
