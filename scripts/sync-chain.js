"use strict";
// Republishes public/api from real Solana mainnet state. This is the build-time
// and cron path: it bakes a snapshot so the site has something to serve even
// when the live handlers under api/ cannot reach an RPC.
const fs = require("fs");
const path = require("path");
const { readDesk, knownFrom, seatPayload } = require("./chain");

const root = path.join(__dirname, "..");
const SIG_LIMIT = Number(process.env.SYNC_SIG_LIMIT || 40);

async function main() {
  const api = path.join(root, "public/api");
  const boardPath = path.join(api, "leaderboard.json");
  const board = JSON.parse(fs.readFileSync(boardPath, "utf8"));

  const tapePath = path.join(api, "tape.json");
  const previous = fs.existsSync(tapePath) ? JSON.parse(fs.readFileSync(tapePath, "utf8")) : { items: [] };

  const { tape, fillsBySeat } = await readDesk(board, {
    sigLimit: SIG_LIMIT,
    known: knownFrom(previous.items),
    pitches: (previous.items || []).filter((i) => i.type !== "fill")
  });

  for (const trader of board.traders) {
    console.log(
      trader.slug.padEnd(6),
      Number(trader.equitySol || 0).toFixed(4).padStart(10) + " SOL",
      (trader.bag ? trader.bag.ticker : "no bag").padEnd(10),
      (fillsBySeat[trader.slug] || []).length + " fills"
    );
  }

  fs.writeFileSync(tapePath, JSON.stringify({ items: tape }, null, 2) + "\n");
  fs.writeFileSync(boardPath, JSON.stringify(board, null, 2) + "\n");
  fs.writeFileSync(
    path.join(api, "health.json"),
    JSON.stringify({ ok: true, status: board.status, checkedAt: board.updatedAt }, null, 2) + "\n"
  );
  for (const trader of board.traders) {
    const file = path.join(api, "traders", trader.slug + ".json");
    const seat = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    fs.writeFileSync(
      file,
      JSON.stringify({ ...seat, ...seatPayload(trader, fillsBySeat, tape) }, null, 2) + "\n"
    );
  }
  console.log(
    "chain sync ok — status " + board.status + ", " + Object.values(fillsBySeat).flat().length + " fills on the tape"
  );
}

main().catch((err) => {
  // A deploy must not fail because an RPC was rate limited; the build keeps the
  // last published numbers instead.
  console.warn("chain sync skipped: " + err.message);
});
