// Builds scripts/image-review.html from scripts/image-candidates.json so the
// proposed photos can be eyeballed before running apply-images.ts.
//   node scripts/build-review-page.js
const fs = require("node:fs");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const candidates = JSON.parse(fs.readFileSync("scripts/image-candidates.json", "utf8"))
  .filter((c) => c.imageUrl)
  // Weakest matches first so they get the most attention.
  .sort((a, b) => (a.titleScore ?? 9) + (a.ingredientScore ?? 9) - ((b.titleScore ?? 9) + (b.ingredientScore ?? 9)));

const cards = candidates
  .map(
    (c, i) => `
  <figure class="card" data-id="${esc(c.id)}">
    <img src="${esc(c.imageUrl)}" loading="lazy" referrerpolicy="no-referrer" alt="">
    <figcaption>
      <span class="num">${i + 1}</span>
      <strong>${esc(c.title)}</strong>
      <span class="meta">${c.method === "source" ? "own source page" : `from: ${esc(c.pageTitle)}`}</span>
      <span class="meta">${c.width}×${c.height}${c.titleScore != null ? ` · title ${c.titleScore} · ingredients ${c.ingredientScore}` : ""}</span>
      <a href="${esc(c.pageUrl)}" target="_blank" rel="noopener">${esc(new URL(c.pageUrl).hostname)}</a>
    </figcaption>
  </figure>`
  )
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Photo Review</title>
<style>
  :root { --bg:#faf8f5; --card:#fff; --ink:#1f1a17; --muted:#6b625c; --reject:#c2410c; }
  @media (prefers-color-scheme: dark) { :root { --bg:#171412; --card:#221e1b; --ink:#f3eee9; --muted:#a39990; } }
  body { margin:0; font:14px/1.4 system-ui, sans-serif; background:var(--bg); color:var(--ink); }
  header { position:sticky; top:0; z-index:1; background:var(--bg); padding:12px 16px; border-bottom:1px solid #8883;
           display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  h1 { font-size:18px; margin:0; }
  button { font:inherit; padding:6px 12px; border-radius:6px; border:1px solid #8886; background:var(--card); color:var(--ink); cursor:pointer; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; padding:16px; }
  .card { margin:0; background:var(--card); border-radius:10px; overflow:hidden; cursor:pointer; outline:3px solid transparent; }
  .card img { width:100%; aspect-ratio:4/3; object-fit:cover; display:block; background:#8882; }
  figcaption { padding:10px; display:flex; flex-direction:column; gap:3px; }
  .meta { color:var(--muted); font-size:12px; }
  .num { color:var(--muted); font-size:12px; }
  a { font-size:12px; color:inherit; }
  .card.rejected { outline-color:var(--reject); }
  .card.rejected img { opacity:.25; }
  .card.rejected strong::before { content:"✕ REJECTED  "; color:var(--reject); }
</style></head><body>
<header>
  <h1>${candidates.length} proposed photos</h1>
  <span class="meta">Click a card to reject it. Weakest matches are shown first.</span>
  <span id="count" class="meta">0 rejected</span>
  <button id="copy">Copy rejected list</button>
</header>
<main class="grid">${cards}</main>
<script>
  const rejected = new Set();
  const count = document.getElementById("count");
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.tagName === "A") return;
      const id = card.dataset.id;
      rejected.has(id) ? rejected.delete(id) : rejected.add(id);
      card.classList.toggle("rejected");
      count.textContent = rejected.size + " rejected";
    });
  });
  document.getElementById("copy").addEventListener("click", async () => {
    const text = JSON.stringify([...rejected]);
    try { await navigator.clipboard.writeText(text); alert("Copied " + rejected.size + " ids — paste them back to Claude."); }
    catch { prompt("Copy this:", text); }
  });
</script>
</body></html>`;

fs.writeFileSync("scripts/image-review.html", html);
console.log(`Wrote scripts/image-review.html with ${candidates.length} photos`);
