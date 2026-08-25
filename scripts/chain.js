"use strict";
// Reads real Solana mainnet state for the desk. Kept separate from the build
// script so request handlers under api/ can read the chain on demand instead of
// only serving whatever the last deploy happened to bake in.

const RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAMS = [
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
];
const LAMPORTS_PER_SOL = 1e9;
const TAPE_LIMIT = 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let rpcId = 0;
// The public endpoint rate limits hard, and a 429 mid-run would otherwise throw
// away a read that had already covered most of the desk.
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

// Module scope, so a warm serverless container reuses symbols it already looked
// up rather than re-querying Jupiter for every request.
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

// Only unseen signatures are pulled in full, so a re-read costs a couple of RPC
// calls per seat instead of replaying the whole history.
async function fillsFor(trader, known, sigLimit) {
  const signatures = await rpc("getSignaturesForAddress", [trader.pubkey, { limit: sigLimit }]);
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
    bag: top
      ? { ticker: (await symbolFor(top.mint)) || top.mint.slice(0, 4), mint: top.mint, amount: top.amount }
      : null,
    holdings: holdings.length
  };
}

// Reads every seat on `board` and returns a fresh board, per-seat fills and the
// merged tape. `board` is mutated in place, matching how the build script used
// to work; callers that care pass a clone.
async function readDesk(board, options = {}) {
  const sigLimit = options.sigLimit || 40;
  const known = options.known || new Map();
  const pitches = options.pitches || [];

  let funded = 0;
  const fillsBySeat = {};
  for (const trader of board.traders) {
    let fills;
    try {
      const seat = await readSeat(trader);
      trader.equitySol = seat.equitySol;
      trader.bag = seat.bag;
      if (seat.equitySol > 0 || seat.holdings > 0) funded++;
      fills = await fillsFor(trader, known, sigLimit);
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
  }

  board.traders.sort((a, b) => (b.equitySol || 0) - (a.equitySol || 0));
  board.traders.forEach((t, i) => { t.rank = i + 1; });
  board.status = funded ? "LIVE" : "UNFUNDED";
  board.updatedAt = new Date().toISOString();
  board.source = { rpc: RPC.replace(/\?.*$/, ""), network: "mainnet-beta" };

  const tape = pitches
    .concat(Object.values(fillsBySeat).flat())
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, TAPE_LIMIT);

  return { board, tape, fillsBySeat, funded };
}

function knownFrom(items) {
  return new Map((items || []).filter((i) => i.type === "fill").map((i) => [i.id, i]));
}

function seatPayload(trader, fillsBySeat, tape) {
  return {
    ...trader,
    fills: fillsBySeat[trader.slug] || [],
    pitches: tape.filter((i) => i.type !== "fill" && (i.trader === trader.slug || i.name === trader.name))
  };
}

module.exports = { RPC, TAPE_LIMIT, readDesk, knownFrom, seatPayload, symbolFor, rpc };
