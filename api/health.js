const { Connection } = require("@solana/web3.js");

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
    return res.status(200).json({
      ok: false,
      status: "UNFUNDED",
      message: "SOLANA_RPC_URL not configured"
    });
  }
  
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const version = await connection.getVersion();
    
    return res.status(200).json({
      ok: true,
      status: "LIVE",
      rpcConfigured: true,
      solanaVersion: version
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      status: "ERROR",
      error: err.message
    });
  }
};
