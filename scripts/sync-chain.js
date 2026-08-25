"use strict";
// Reads the real Solana mainnet state for every seat and republishes public/api
// from it. The published board is otherwise hand-written numbers that drift from
// the chain. Browsers cannot call the public RPC (it 403s cross-origin), so this
// has to run server-side: at build time, or on a cron next to the desk process.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAMS = [
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
];
const LAMPORTS_PER_SOL = 1e9;

let rpcId = 0;
async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params })
  });
  if (!res.ok) throw new Error(method + " http " + res.status);
  const body = await res.json();
  if (body.error) throw new Error(method + ": " + body.error.message);
  return body.result;
}

async function symbolFor(mint) {
  try {
    const res = await fetch("https://lite-api.jup.ag/tokens/v2/search?query=" + mint);
    if (!res.ok) return null;
    const hit = (await res.json()).find((t) => t.id === mint);
    return hit && hit.symbol ? hit.symbol : null;
  } catch (err) {
    return null;
  }
}

async function readSeat(trader) {
  const lamports = await rpc("getBalance", [trader.pubkey]);
  const holdings = [];
  for (const programId of TOKEN_PROGRAMS) {
    const accounts = await rpc("getTokenAccountsByOwner", [
      trader.pubkey,
      { programId },
      { encoding: "jsonParsed", commitment: "confirmed" }
    ]);
    for (const acc of accounts.value) {
      const info = acc.account.data.parsed.info;
      const amount = Number(info.tokenAmount.uiAmount || 0);
      if (amount > 0) holdings.push({ mint: info.mint, amount });
    }
  }
  holdings.sort((a, b) => b.amount - a.amount);
  const top = holdings[0] || null;
  return {
    equitySol: (lamports.value != null ? lamports.value : lamports) / LAMPORTS_PER_SOL,
    bag: top ? { ticker: (await symbolFor(top.mint)) || top.mint.slice(0, 4), mint: top.mint, amount: top.amount } : null,
    holdings: holdings.length
  };
}

async function main() {
  const api = path.join(root, "public/api");
  const boardPath = path.join(api, "leaderboard.json");
  const board = JSON.parse(fs.readFileSync(boardPath, "utf8"));

  let funded = 0;
  for (const trader of board.traders) {
    const seat = await readSeat(trader);
    trader.equitySol = seat.equitySol;
    trader.bag = seat.bag;
    if (seat.equitySol > 0 || seat.holdings > 0) funded++;
    console.log(
      trader.slug.padEnd(6),
      seat.equitySol.toFixed(4).padStart(10) + " SOL",
      seat.bag ? seat.bag.ticker : "no bag"
    );
  }

  board.traders.sort((a, b) => (b.equitySol || 0) - (a.equitySol || 0));
  board.traders.forEach((t, i) => { t.rank = i + 1; });
  board.status = funded ? "LIVE" : "UNFUNDED";
  board.updatedAt = new Date().toISOString();
  board.source = { rpc: RPC.replace(/\?.*$/, ""), network: "mainnet-beta" };

  fs.writeFileSync(boardPath, JSON.stringify(board, null, 2) + "\n");
  fs.writeFileSync(
    path.join(api, "health.json"),
    JSON.stringify({ ok: true, status: board.status, checkedAt: board.updatedAt }, null, 2) + "\n"
  );
  for (const trader of board.traders) {
    const file = path.join(api, "traders", trader.slug + ".json");
    const seat = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    fs.writeFileSync(file, JSON.stringify({ ...seat, ...trader }, null, 2) + "\n");
  }
  console.log("chain sync ok — status " + board.status);
}

main().catch((err) => {
  // A deploy must not fail because an RPC was rate limited; the build keeps the
  // last published numbers instead.
  console.warn("chain sync skipped: " + err.message);
});
