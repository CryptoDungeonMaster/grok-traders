"use strict";
const { desk, send, seatPayload } = require("../_desk");

module.exports = async function handler(req, res) {
  // Vercel supplies req.query for dynamic segments; the path is the fallback for
  // a plain Node server. Either way the ".json" suffix the page may append has
  // to come off before matching a slug.
  const raw = (req.query && (req.query.name || req.query.slug)) || (req.url || "").split("?")[0].split("/").pop();
  const slug = String(raw || "").toLowerCase().replace(/\.json$/, "");

  const state = await desk();
  const trader = (state.board.traders || []).find((t) => t.slug === slug);
  if (!trader) {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "unknown seat" }));
    return;
  }
  send(res, seatPayload(trader, state.fillsBySeat, state.tape));
};
