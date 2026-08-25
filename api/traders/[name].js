const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const TRADERS = {
  blitz: { id: "blitz", name: "Blitz", voice: "Momentum sniper. Ape the heat, dump into strength.", pubkey: "2S4aMjsBk6YKD9UcfeXAfFfeeDA5hibst1UJfGpPnsqP", slug: "blitz" },
  sage: { id: "sage", name: "Sage", voice: "Cold contrarian. Fade the obvious, buy the dump.", pubkey: "7JeRYiNZpKn4yiVSp8EPPsiGwgxFiyNf3tT6zTf6Mzs8", slug: "sage" },
  hype: { id: "hype", name: "Hype", voice: "Narrative evangelist. Buy the lore, convert the desk.", pubkey: "4Cio13C8gEeJZaWdwQQybMGhdu7zhaz6eCvHhyCrcEMK", slug: "hype" },
  hex: { id: "hex", name: "Hex", voice: "On-chain data nerd. Numbers first, almost no slang.", pubkey: "ArPxuqfoPT7TRHzr77rTEUQt1dUY4F2X7QFvGTSkeEtF", slug: "hex" },
  ghost: { id: "ghost", name: "Ghost", voice: "Quiet size. Wait, confirm, then hit.", pubkey: "2NzdR2DWafucFV9NDPUcMM3GT8Lu2gXMWiZKEM2S39H9", slug: "ghost" }
};

async function getTokenAccounts(connection, pubkey) {
  try {
    const response = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    let bag = null;
    
    for (const account of response.value) {
      const info = account.account.data.parsed.info;
      const amount = parseFloat(info.tokenAmount.uiAmount || 0);
      if (amount > 0) {
        bag = {
          mint: info.mint,
          ticker: info.mint.slice(0, 8),
          amount
        };
        break;
      }
    }
    
    return bag;
  } catch (err) {
    return null;
  }
}

async function getTraderFills(connection, pubkey, limit = 10) {
  try {
    const pk = new PublicKey(pubkey);
    const signatures = await connection.getSignaturesForAddress(pk, { limit });
    
    return signatures.map(sig => ({
      type: "fill",
      at: new Date(sig.blockTime * 1000).toISOString(),
      body: "SOL transfer",
      solAmount: 0,
      signature: sig.signature
    }));
  } catch (err) {
    return [];
  }
}

function getFallbackTrader(slug) {
  try {
    const deskPath = path.join(process.cwd(), "data/desk.json");
    if (fs.existsSync(deskPath)) {
      const desk = JSON.parse(fs.readFileSync(deskPath, "utf8"));
      const trader = desk.traders.find(t => t.id === slug);
      if (trader) {
        const pitches = (desk.tape || []).filter(t => t.trader.toLowerCase() === slug).map(t => ({
          type: "pitch",
          at: t.ts,
          ticker: t.ticker,
          mint: t.mint,
          body: t.body
        }));
        return {
          ...trader,
          slug,
          equitySol: 0,
          rank: 1,
          fills: [],
          pitches
        };
      }
    }
  } catch (err) {
    console.error("Fallback trader load failed:", err);
  }
  
  const trader = TRADERS[slug];
  if (!trader) return null;
  
  return {
    ...trader,
    equitySol: 0,
    bag: null,
    rank: 1,
    fills: [],
    pitches: []
  };
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
  
  const { name } = req.query;
  const slug = (name || "").toLowerCase();
  
  const trader = TRADERS[slug];
  if (!trader) {
    return res.status(404).json({ error: "Trader not found" });
  }
  
  const rpcUrl = process.env.SOLANA_RPC_URL;
  
  if (!rpcUrl) {
    const fallback = getFallbackTrader(slug);
    return res.status(200).json(fallback);
  }
  
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const pubkey = new PublicKey(trader.pubkey);
    
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    const bag = await getTokenAccounts(connection, pubkey);
    const fills = await getTraderFills(connection, trader.pubkey);
    
    return res.status(200).json({
      ...trader,
      equitySol: solBalance,
      bag,
      rank: 1,
      fills,
      pitches: []
    });
  } catch (err) {
    console.error("Trader detail error:", err);
    const fallback = getFallbackTrader(slug);
    return res.status(200).json(fallback);
  }
};
