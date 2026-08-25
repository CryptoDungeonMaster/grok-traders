"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const required = [
  "public/index.html",
  "public/trader.html",
  "public/css/desk.css",
  "public/js/desk.js",
  "public/brand/mark-web.png",
  "public/brand/wordmark-web.png",
  "public/favicon.png"
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("missing " + rel);
    process.exit(1);
  }
}

const seedPath = fs.existsSync(path.join(root, "data/desk.json"))
  ? path.join(root, "data/desk.json")
  : path.join(root, "data/seed.json");
const desk = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const bags = {
  blitz: { ticker: "APPLECAT", mint: "6ESmK8y4rugurH1ZQWyEBCTYjfjatnALi1iNcY7rpump", sizeSol: 2 },
  sage: { ticker: "KERMIT", mint: "31TBAGQ4cydajbZYCqvuyA9SqmKV7zvtdmohkLAJpump", sizeSol: 1.5 },
  hype: { ticker: "OTTER", mint: "FojFAR8uj6zn3327KD9WfFBVTbjvCwsVR5D3dyvSpump", sizeSol: 2.5 }
};
for (const [slug, bag] of Object.entries(bags)) {
  if (desk.traders[slug] && !desk.traders[slug].bag) desk.traders[slug].bag = bag;
}

const traders = Object.values(desk.traders).map((t, i) => ({
  ...t,
  rank: i + 1
})).sort((a, b) => (b.equitySol || 0) - (a.equitySol || 0))
  .map((t, i) => ({ ...t, rank: i + 1 }));

const board = {
  status: "UNFUNDED",
  updatedAt: desk.updatedAt || new Date().toISOString(),
  traders
};
const tape = { items: desk.tape || [] };

const api = path.join(root, "public/api");
fs.mkdirSync(path.join(api, "traders"), { recursive: true });
fs.writeFileSync(path.join(api, "leaderboard.json"), JSON.stringify(board, null, 2) + "\n");
fs.writeFileSync(path.join(api, "tape.json"), JSON.stringify(tape, null, 2) + "\n");
fs.writeFileSync(path.join(api, "health.json"), JSON.stringify({ ok: true, status: board.status }, null, 2) + "\n");

for (const t of traders) {
  const fills = [];
  const pitches = (desk.tape || []).filter((e) => e.trader === t.slug || e.name === t.name);
  fs.writeFileSync(
    path.join(api, "traders", t.slug + ".json"),
    JSON.stringify({ ...t, fills, pitches }, null, 2) + "\n"
  );
}

console.log("GROK TRADERS static build ok");
