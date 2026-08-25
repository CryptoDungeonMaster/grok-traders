const fs = require("fs");
const path = require("path");

const VALID_TRADERS = ["blitz", "sage", "hype", "hex", "ghost"];

function authenticate(req) {
  const apiKey = req.headers["x-desk-key"];
  const expectedKey = process.env.DESK_API_KEY;
  
  if (!expectedKey) {
    return { ok: false, message: "DESK_API_KEY not configured" };
  }
  
  if (!apiKey || apiKey !== expectedKey) {
    return { ok: false, message: "Invalid or missing x-desk-key" };
  }
  
  return { ok: true };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-desk-key");
  res.setHeader("Content-Type", "application/json");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const auth = authenticate(req);
  if (!auth.ok) {
    return res.status(401).json({ error: auth.message });
  }
  
  const { trader, mint, ticker, body, solAmount } = req.body || {};
  
  if (!trader || !VALID_TRADERS.includes(trader.toLowerCase())) {
    return res.status(400).json({ error: "Invalid trader" });
  }
  
  if (!mint || !ticker) {
    return res.status(400).json({ error: "mint and ticker are required" });
  }
  
  const pitch = {
    id: `pitch-${Date.now()}`,
    type: "pitch",
    at: new Date().toISOString(),
    trader: trader.toLowerCase(),
    name: trader.charAt(0).toUpperCase() + trader.slice(1).toLowerCase(),
    mint,
    ticker,
    body: body || "",
    solAmount: solAmount || null
  };
  
  return res.status(201).json({
    ok: true,
    pitch
  });
};
