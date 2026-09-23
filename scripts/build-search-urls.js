// Converts scripts/search-urls-raw.txt ("<index> url url ...", index into
// scripts/search-list.json) into scripts/search-urls.json ({ recipeId: [urls] }).
const fs = require("node:fs");
const list = JSON.parse(fs.readFileSync("scripts/search-list.json", "utf8"));
const out = {};
for (const line of fs.readFileSync("scripts/search-urls-raw.txt", "utf8").split(/\r?\n/)) {
  const [idx, ...urls] = line.trim().split(/\s+/);
  if (!idx || !list[idx]) continue;
  const id = list[idx].id;
  out[id] = [...new Set([...(out[id] ?? []), ...urls])];
}
fs.writeFileSync("scripts/search-urls.json", JSON.stringify(out, null, 2));
console.log(`${Object.keys(out).length} recipes with search URLs`);
