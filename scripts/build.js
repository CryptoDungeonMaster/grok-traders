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

const api = path.join(root, "public/api");
fs.mkdirSync(path.join(api, "traders"), { recursive: true });
let keepLive = false;
try {
  const cur = JSON.parse(fs.readFileSync(path.join(api, "leaderboard.json"), "utf8"));
  keepLive = cur && cur.status === "LIVE" && Array.isArray(cur.traders);
} catch (err) {
  keepLive = false;
}

if (!keepLive) {
  const seedPath = fs.existsSync(path.join(root, "data/desk.json"))
    ? path.join(root, "data/desk.json")
    : path.join(root, "data/seed.json");
  const desk = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const traders = Object.values(desk.traders).map((t, i) => ({
    ...t,
    rank: i + 1
  })).sort((a, b) => (b.equitySol || 0) - (a.equitySol || 0))
    .map((t, i) => ({ ...t, rank: i + 1 }));
  const board = {
    status: desk.status || "UNFUNDED",
    updatedAt: desk.updatedAt || new Date().toISOString(),
    traders
  };
  const tape = { items: desk.tape || [] };
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
}

const tpl = fs.readFileSync(path.join(root, "public/trader.html"), "utf8");
for (const slug of ["blitz", "sage", "hype", "hex", "ghost"]) {
  const html = tpl.replace('data-seat=""', 'data-seat="' + slug + '"');
  fs.writeFileSync(path.join(root, "public", slug + ".html"), html);
}
console.log(keepLive ? "GROK TRADERS static build ok (kept LIVE tape)" : "GROK TRADERS static build ok");
