const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

const TRADERS = [
  { id: "blitz", name: "Blitz", voice: "Momentum sniper. Ape the heat, dump into strength.", pubkey: "2S4aMjsBk6YKD9UcfeXAfFfeeDA5hibst1UJfGpPnsqP", slug: "blitz" },
  { id: "sage", name: "Sage", voice: "Cold contrarian. Fade the obvious, buy the dump.", pubkey: "7JeRYiNZpKn4yiVSp8EPPsiGwgxFiyNf3tT6zTf6Mzs8", slug: "sage" },
  { id: "hype", name: "Hype", voice: "Narrative evangelist. Buy the lore, convert the desk.", pubkey: "4Cio13C8gEeJZaWdwQQybMGhdu7zhaz6eCvHhyCrcEMK", slug: "hype" },
  { id: "hex", name: "Hex", voice: "On-chain data nerd. Numbers first, almost no slang.", pubkey: "ArPxuqfoPT7TRHzr77rTEUQt1dUY4F2X7QFvGTSkeEtF", slug: "hex" },
  { id: "ghost", name: "Ghost", voice: "Quiet size. Wait, confirm, then hit.", pubkey: "2NzdR2DWafucFV9NDPUcMM3GT8Lu2gXMWiZKEM2S39H9", slug: "ghost" }
];

async function getTokenAccounts(connection, pubkey) {
  try {
    const response = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
    
    let totalSol = 0;
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
    
    return { totalSol, bag };
  } catch (err) {
    return { totalSol: 0, bag: null };
  }
}

async function getTraderData(connection, trader) {
  try {
    const pubkey = new PublicKey(trader.pubkey);
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    const { totalSol: tokenValueSol, bag } = await getTokenAccounts(connection, pubkey);
    const equitySol = solBalance + tokenValueSol;
    
    return {
      ...trader,
      equitySol,
      bag,
      lastEvent: null
    };
  } catch (err) {
    return {
      ...trader,
      equitySol: 0,
      bag: null,
      lastEvent: null
    };
  }
}

function getFallbackData() {
  try {
    const deskPath = path.join(process.cwd(), "data/desk.json");
    if (fs.existsSync(deskPath)) {
      const desk = JSON.parse(fs.readFileSync(deskPath, "utf8"));
      return {
        status: desk.status || "UNFUNDED",
        traders: desk.traders.map((t, i) => ({ ...t, slug: t.id, rank: i + 1 })),
        updatedAt: desk.updatedAt || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error("Fallback data load failed:", err);
  }
  
  return {
    status: "UNFUNDED",
    traders: TRADERS.map((t, i) => ({ ...t, equitySol: 0, bag: null, rank: i + 1 })),
    updatedAt: new Date().toISOString()
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
  
  const rpcUrl = process.env.SOLANA_RPC_URL;
  
  if (!rpcUrl) {
    const fallback = getFallbackData();
    return res.status(200).json(fallback);
  }
  
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    
    const tradersData = await Promise.all(
      TRADERS.map(trader => getTraderData(connection, trader))
    );
    
    const sorted = tradersData.sort((a, b) => (b.equitySol || 0) - (a.equitySol || 0));
    const ranked = sorted.map((t, i) => ({ ...t, rank: i + 1 }));
    
    const totalSol = ranked.reduce((sum, t) => sum + (t.equitySol || 0), 0);
    const status = totalSol > 0 ? "LIVE" : "UNFUNDED";
    
    return res.status(200).json({
      status,
      traders: ranked,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    const fallback = getFallbackData();
    return res.status(200).json(fallback);
  }
};
