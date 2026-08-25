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
  slug: t.slug || t.id || String(t.name || "").toLowerCase(),
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

// Published API files are the live desk state; the seed only fills in gaps so a
// redeploy cannot roll the board back to opening prices.
function publish(rel, value) {
  const file = path.join(api, rel);
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      console.warn("rewriting unreadable " + rel);
    }
  }
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  return value;
}

const liveBoard = publish("leaderboard.json", board);
const liveTape = publish("tape.json", tape);
publish("health.json", { ok: true, status: liveBoard.status });

const snapshot = { board: liveBoard, tape: liveTape, traders: {} };
for (const t of traders) {
  const fills = [];
  const pitches = (desk.tape || []).filter((e) => e.trader === t.slug || e.name === t.name);
  snapshot.traders[t.slug] = publish(
    path.join("traders", t.slug + ".json"),
    { ...t, fills, pitches }
  );
}
fs.writeFileSync(
  path.join(root, "public/js/snapshot.js"),
  "window.__DESK__ = " + JSON.stringify(snapshot) + ";\n"
);

const tpl = fs.readFileSync(path.join(root, "public/trader.html"), "utf8");
for (const slug of ["blitz", "sage", "hype", "hex", "ghost"]) {
  const html = tpl.replace('data-seat=""', 'data-seat="' + slug + '"');
  fs.writeFileSync(path.join(root, "public", slug + ".html"), html);
}
console.log("GROK TRADERS static build ok");
