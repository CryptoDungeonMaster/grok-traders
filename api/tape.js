const { Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const TRADERS = [
  { slug: "blitz", name: "Blitz", pubkey: "2S4aMjsBk6YKD9UcfeXAfFfeeDA5hibst1UJfGpPnsqP" },
  { slug: "sage", name: "Sage", pubkey: "7JeRYiNZpKn4yiVSp8EPPsiGwgxFiyNf3tT6zTf6Mzs8" },
  { slug: "hype", name: "Hype", pubkey: "4Cio13C8gEeJZaWdwQQybMGhdu7zhaz6eCvHhyCrcEMK" },
  { slug: "hex", name: "Hex", pubkey: "ArPxuqfoPT7TRHzr77rTEUQt1dUY4F2X7QFvGTSkeEtF" },
  { slug: "ghost", name: "Ghost", pubkey: "2NzdR2DWafucFV9NDPUcMM3GT8Lu2gXMWiZKEM2S39H9" }
];

let tapeCache = [];

async function getRecentSignatures(connection, trader) {
  try {
    const pubkey = new PublicKey(trader.pubkey);
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 5 });
    
    return signatures.map(sig => ({
      type: "fill",
      at: new Date(sig.blockTime * 1000).toISOString(),
      trader: trader.slug,
      name: trader.name,
      body: "SOL transfer",
      solAmount: 0,
      signature: sig.signature
    }));
  } catch (err) {
    return [];
  }
}

function getFallbackTape() {
  try {
    const deskPath = path.join(process.cwd(), "data/desk.json");
    if (fs.existsSync(deskPath)) {
      const desk = JSON.parse(fs.readFileSync(deskPath, "utf8"));
      const items = (desk.tape || []).map(t => ({
        type: t.kind === "PITCH" ? "pitch" : "fill",
        at: t.ts,
        trader: t.trader.toLowerCase(),
        name: t.trader,
        ticker: t.ticker,
        mint: t.mint,
        body: t.body,
        solAmount: null
      }));
      return { items };
    }
  } catch (err) {
    console.error("Fallback tape load failed:", err);
  }
  
  return { items: [] };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const rpcUrl = process.env.SOLANA_RPC_URL;
  
  if (!rpcUrl) {
    const fallback = getFallbackTape();
    return res.status(200).json(fallback);
  }
  
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    
    const allSigs = await Promise.all(
      TRADERS.map(trader => getRecentSignatures(connection, trader))
    );
    
    const flattened = allSigs.flat();
    const combined = [...tapeCache, ...flattened];
    const sorted = combined.sort((a, b) => new Date(b.at) - new Date(a.at));
    const unique = sorted.slice(0, 20);
    
    return res.status(200).json({ items: unique });
  } catch (err) {
    console.error("Tape error:", err);
    const fallback = getFallbackTape();
    return res.status(200).json(fallback);
  }
};
