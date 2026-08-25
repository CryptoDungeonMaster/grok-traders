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
const SIG_LIMIT = Number(process.env.SYNC_SIG_LIMIT || 40);
const TAPE_LIMIT = 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let rpcId = 0;
// The public endpoint rate limits hard, and a 429 mid-run would otherwise throw
// away a sync that had already read most of the desk.
async function rpc(method, params, attempt = 0) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params })
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(method + " http " + res.status);
    await sleep(400 * Math.pow(2, attempt));
    return rpc(method, params, attempt + 1);
  }
  if (!res.ok) throw new Error(method + " http " + res.status);
  const body = await res.json();
  if (body.error) {
    if (body.error.code === 429 && attempt < 5) {
      await sleep(400 * Math.pow(2, attempt));
      return rpc(method, params, attempt + 1);
    }
    throw new Error(method + ": " + body.error.message);
  }
  return body.result;
}

const symbols = new Map();
async function symbolFor(mint) {
  if (symbols.has(mint)) return symbols.get(mint);
  let symbol = null;
  try {
    const res = await fetch("https://lite-api.jup.ag/tokens/v2/search?query=" + mint);
    if (res.ok) {
      const hit = (await res.json()).find((t) => t.id === mint);
      if (hit && hit.symbol) symbol = hit.symbol;
    }
  } catch (err) {
    symbol = null;
  }
  symbols.set(mint, symbol);
  return symbol;
}

function shortMint(mint) {
  return mint.slice(0, 4) + "…" + mint.slice(-4);
}

// Turn one confirmed transaction into a fill by reading what the wallet itself
// gained and lost: tokens in with SOL out is a buy, tokens out with SOL in is a
// sell. This works for any venue, so it does not care which router the bot uses.
async function fillFrom(signature, trader) {
  const tx = await rpc("getTransaction", [
    signature,
    { maxSupportedTransactionVersion: 0, encoding: "jsonParsed", commitment: "confirmed" }
  ]);
  if (!tx || tx.meta.err) return null;

  const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey);
  const index = keys.indexOf(trader.pubkey);
  if (index === -1) return null;
  const solDelta = (tx.meta.postBalances[index] - tx.meta.preBalances[index]) / LAMPORTS_PER_SOL;

  const pre = tx.meta.preTokenBalances || [];
  const post = tx.meta.postTokenBalances || [];
  const moved = new Map();
  for (const bal of post.concat(pre)) {
    if (bal.owner !== trader.pubkey) continue;
    if (moved.has(bal.mint)) continue;
    const before = pre.find((b) => b.owner === trader.pubkey && b.mint === bal.mint);
    const after = post.find((b) => b.owner === trader.pubkey && b.mint === bal.mint);
    const delta =
      Number((after && after.uiTokenAmount.uiAmount) || 0) -
      Number((before && before.uiTokenAmount.uiAmount) || 0);
    if (delta !== 0) moved.set(bal.mint, delta);
  }
  if (!moved.size) return null;

  const [mint, delta] = [...moved.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const side = delta > 0 ? "buy" : "sell";
  const ticker = (await symbolFor(mint)) || shortMint(mint);
  return {
    id: signature,
    type: "fill",
    side,
    at: new Date((tx.blockTime || 0) * 1000).toISOString(),
    trader: trader.slug,
    name: trader.name,
    ticker,
    mint,
    tokenAmount: Math.abs(delta),
    solAmount: Math.abs(solDelta),
    txSig: signature,
    paper: false
  };
}

// Only unseen signatures are pulled in full, so a scheduled re-sync costs a
// couple of RPC calls per seat instead of replaying the whole history.
async function fillsFor(trader, known) {
  const signatures = await rpc("getSignaturesForAddress", [trader.pubkey, { limit: SIG_LIMIT }]);
  const fills = [];
  for (const entry of signatures) {
    if (entry.err) continue;
    const cached = known.get(entry.signature);
    if (cached) {
      fills.push(cached);
      continue;
    }
    const fill = await fillFrom(entry.signature, trader);
    if (fill) fills.push(fill);
  }
  return fills;
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

  const tapePath = path.join(api, "tape.json");
  const previous = fs.existsSync(tapePath) ? JSON.parse(fs.readFileSync(tapePath, "utf8")) : { items: [] };
  const known = new Map((previous.items || []).filter((i) => i.type === "fill").map((i) => [i.id, i]));
  const pitches = (previous.items || []).filter((i) => i.type !== "fill");

  let funded = 0;
  const fillsBySeat = {};
  for (const trader of board.traders) {
    let fills;
    try {
      const seat = await readSeat(trader);
      trader.equitySol = seat.equitySol;
      trader.bag = seat.bag;
      if (seat.equitySol > 0 || seat.holdings > 0) funded++;
      fills = await fillsFor(trader, known);
    } catch (err) {
      // One unreachable seat should not blank the rest of the desk.
      console.warn(trader.slug + " skipped: " + err.message);
      fills = [...known.values()].filter((f) => f.trader === trader.slug);
      if (trader.equitySol > 0) funded++;
    }
    fills.sort((a, b) => new Date(b.at) - new Date(a.at));
    fillsBySeat[trader.slug] = fills;
    trader.lastEvent = fills[0]
      ? { kind: fills[0].side.toUpperCase(), type: "fill", ticker: fills[0].ticker, at: fills[0].at, paper: false }
      : trader.lastEvent || null;

    console.log(
      trader.slug.padEnd(6),
      Number(trader.equitySol || 0).toFixed(4).padStart(10) + " SOL",
      (trader.bag ? trader.bag.ticker : "no bag").padEnd(10),
      fills.length + " fills"
    );
  }

  const tape = pitches
    .concat(Object.values(fillsBySeat).flat())
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, TAPE_LIMIT);
  fs.writeFileSync(tapePath, JSON.stringify({ items: tape }, null, 2) + "\n");

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
    const seatPitches = tape.filter(
      (i) => i.type !== "fill" && (i.trader === trader.slug || i.name === trader.name)
    );
    fs.writeFileSync(
      file,
      JSON.stringify({ ...seat, ...trader, fills: fillsBySeat[trader.slug] || [], pitches: seatPitches }, null, 2) + "\n"
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
