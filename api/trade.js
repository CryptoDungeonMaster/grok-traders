const { Connection, Keypair, Transaction, VersionedTransaction } = require("@solana/web3.js");
const bs58 = require("bs58");

const VALID_TRADERS = ["blitz", "sage", "hype", "hex", "ghost"];
const PUMP_API = "https://pumpportal.fun/api/trade-local";

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

function getTraderKeypair(trader) {
  const envKey = `${trader.toUpperCase()}_SECRET`;
  const secret = process.env[envKey];
  
  if (!secret) {
    throw new Error(`${envKey} environment variable not set`);
  }
  
  try {
    let secretKey;
    if (secret.startsWith("[") && secret.endsWith("]")) {
      const arr = JSON.parse(secret);
      secretKey = Uint8Array.from(arr);
    } else {
      secretKey = bs58.decode(secret);
    }
    
    return Keypair.fromSecretKey(secretKey);
  } catch (err) {
    throw new Error(`Invalid secret key format for ${envKey}`);
  }
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
  
  const { trader, side, mint, solAmount, slippage } = req.body || {};
  
  if (!trader || !VALID_TRADERS.includes(trader.toLowerCase())) {
    return res.status(400).json({ error: "Invalid trader" });
  }
  
  if (!side || !["buy", "sell"].includes(side.toLowerCase())) {
    return res.status(400).json({ error: "Invalid side (must be buy or sell)" });
  }
  
  if (!mint) {
    return res.status(400).json({ error: "mint is required" });
  }
  
  if (!solAmount || solAmount <= 0) {
    return res.status(400).json({ error: "solAmount must be positive" });
  }
  
  const maxSol = parseFloat(process.env.MAX_SOL_PER_TRADE || "0.05");
  if (solAmount > maxSol) {
    return res.status(400).json({ 
      error: `solAmount exceeds MAX_SOL_PER_TRADE limit of ${maxSol} SOL` 
    });
  }
  
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    return res.status(503).json({ 
      error: "SOLANA_RPC_URL not configured" 
    });
  }
  
  try {
    const keypair = getTraderKeypair(trader);
    const connection = new Connection(rpcUrl, "confirmed");
    
    const tradePayload = {
      publicKey: keypair.publicKey.toBase58(),
      action: side.toLowerCase(),
      mint,
      amount: solAmount,
      denominatedInSol: "true",
      slippage: slippage || 15,
      priorityFee: 0.0001,
      pool: "auto"
    };
    
    const response = await fetch(PUMP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tradePayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PumpPortal API error: ${response.status} - ${errorText}`);
    }
    
    const txData = await response.arrayBuffer();
    const txBuffer = Buffer.from(txData);
    
    let transaction;
    try {
      transaction = VersionedTransaction.deserialize(txBuffer);
    } catch (err) {
      transaction = Transaction.from(txBuffer);
    }
    
    if (transaction instanceof VersionedTransaction) {
      transaction.sign([keypair]);
    } else {
      transaction.sign(keypair);
    }
    
    const serialized = transaction.serialize();
    const signature = await connection.sendRawTransaction(serialized, {
      skipPreflight: false,
      maxRetries: 3
    });
    
    await connection.confirmTransaction(signature, "confirmed");
    
    const solscanUrl = `https://solscan.io/tx/${signature}`;
    
    return res.status(200).json({
      ok: true,
      signature,
      solscan: solscanUrl,
      trader,
      side,
      mint,
      solAmount
    });
  } catch (err) {
    console.error("Trade execution error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};
