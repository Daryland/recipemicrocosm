import * as cheerio from "cheerio";
import { sectionHeader } from "../src/lib/recipeSections";

export interface ParsedRecipe {
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  ingredients: string[];
  steps: string[];
  slug: string;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Shop plugs at the end of the method ("Looking for Masa Harina? Our friends at Masienda...").
const PROMO_RE = /^looking for .{2,40}\?/i;

/**
 * Bayless opens each part of the method with a bold lead-in ("Make the sauce.",
 * "Working Ahead:"). That lead-in becomes a part header and the rest stays the step.
 */
function splitLeadIn($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): { header?: string; text: string } {
  const text = cleanText(el.text());
  // The lead-in is often split across tags: <b>Cook the </b><b><i>nopales</i></b><b>.</b>
  let block = el;
  while (block.children().first().is("p") && !cleanText(block.contents().first().text())) block = block.children().first();
  let lead = "";
  for (const child of block.contents().toArray()) {
    const node = $(child);
    if (node.is("b, strong")) lead += node.text();
    else if (child.type === "text" && !node.text().trim()) lead += " ";
    else break;
  }
  lead = cleanText(lead);
  if (lead && lead.length <= 60 && text.startsWith(lead)) {
    const rest = text.slice(lead.length).replace(/^[\s.:–—-]+/, "");
    return { header: sectionHeader(lead), text: rest };
  }
  return { text };
}

export function parseRecipePage(html: string, url: string): ParsedRecipe | null {
  const $ = cheerio.load(html);

  const h1 = cleanText($("h1").first().text());
  const spanishTitle = cleanText($(".spanish-title").first().text());
  const title = spanishTitle ? `${h1} (${spanishTitle})` : h1;
  if (!title) return null;

  const imageUrl =
    $("#recipe-image").attr("data-src") ||
    $("#recipe-image").attr("src") ||
    undefined;

  const videoUrl = $(".recipe-instructions iframe[src*='youtube']").attr("src") || undefined;

  // Ingredients, with any sub-headings between the lists ("For the sauce") kept as part headers.
  const ingredients: string[] = [];
  $(".recipe-ingredients")
    .find("li, h4, h5, p, strong")
    .each((_, node) => {
      const el = $(node);
      const text = cleanText(el.text());
      if (!text) return;
      if (el.is("li")) ingredients.push(text);
      else if (!el.parents("li, h4, h5, p").length && text.length <= 60) ingredients.push(sectionHeader(text));
    });

  // Steps are numbered list items on some pages and paragraphs on others (often both).
  const steps: string[] = [];
  $(".recipe-instructions")
    .find("li, p")
    .each((_, node) => {
      const el = $(node);
      if (el.is("p") && el.closest("li").length) return; // already part of its list item
      const { header, text } = splitLeadIn($, el);
      if (PROMO_RE.test(text)) return;
      if (header) steps.push(header);
      if (text) steps.push(text);
    });
  // A trailing header with nothing after it is just a stray bold line.
  while (steps.length && steps[steps.length - 1].endsWith(":")) steps.pop();

  if (ingredients.filter((i) => !i.endsWith(":")).length === 0 || steps.filter((s) => !s.endsWith(":")).length === 0) return null;

  const slugMatch = url.match(/\/recipe\/([^/]+)\/?$/);
  const slug = slugMatch ? slugMatch[1] : cleanText(h1).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return { title, imageUrl, videoUrl, ingredients, steps, slug };
}
