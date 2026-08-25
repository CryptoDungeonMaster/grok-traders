"use strict";
// Live desk state for the request handlers. The baked files under public/api are
// only as fresh as the last deploy, so a seat that buys between deploys is
// invisible on a purely static board; these handlers read the chain instead and
// fall back to the baked snapshot when an RPC is unreachable.
const { readDesk, knownFrom, seatPayload } = require("../scripts/chain");

const bakedBoard = require("../public/api/leaderboard.json");
const bakedTape = require("../public/api/tape.json");
const bakedSeats = {
  blitz: require("../public/api/traders/blitz.json"),
  sage: require("../public/api/traders/sage.json"),
  hype: require("../public/api/traders/hype.json"),
  hex: require("../public/api/traders/hex.json"),
  ghost: require("../public/api/traders/ghost.json")
};

// A full desk read is a few seconds of RPC calls, so a warm container serves
// repeats from memory and the CDN holds the response briefly on top of that.
// Between the two, the page's 10s poll costs the RPC almost nothing.
const TTL_MS = Number(process.env.DESK_TTL_MS || 10000);
const SIG_LIMIT = Number(process.env.DESK_SIG_LIMIT || 12);
const CACHE_CONTROL = "public, s-maxage=10, stale-while-revalidate=60";

let cached = null;
let inflight = null;

function bakedDesk() {
  const fillsBySeat = {};
  for (const slug of Object.keys(bakedSeats)) fillsBySeat[slug] = bakedSeats[slug].fills || [];
  return { board: bakedBoard, tape: bakedTape.items || [], fillsBySeat, live: false };
}

async function read() {
  // The roster (pubkeys, names, voices) is static content; only the numbers and
  // the fills come off the chain, and readDesk mutates the board it is given.
  const board = JSON.parse(JSON.stringify(bakedBoard));
  const baked = bakedTape.items || [];
  const previous = cached ? cached.value.tape : baked;
  const desk = await readDesk(board, {
    sigLimit: SIG_LIMIT,
    known: knownFrom(previous),
    pitches: baked.filter((i) => i.type !== "fill")
  });
  return { board: desk.board, tape: desk.tape, fillsBySeat: desk.fillsBySeat, live: true };
}

async function desk() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  // Concurrent requests on a cold container would otherwise each start their own
  // full desk read and trip the RPC's rate limit.
  if (!inflight) {
    inflight = read()
      .then((value) => {
        cached = { at: Date.now(), value };
        return value;
      })
      .catch((err) => {
        console.warn("live desk read failed: " + err.message);
        // The page has no other source for the roster, so the last good read (or
        // the baked snapshot) beats an empty board.
        return cached ? cached.value : bakedDesk();
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

function send(res, body) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", CACHE_CONTROL);
  res.statusCode = 200;
  res.end(JSON.stringify(body));
}

module.exports = { desk, send, seatPayload, bakedDesk, CACHE_CONTROL };
