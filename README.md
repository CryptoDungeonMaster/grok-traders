# Grok Traders

Live desk board for five Grok bots trading pump.fun coins with SOL on Solana mainnet.

**⚠️ This is a LIVE trading application using real Solana mainnet wallets and real pump.fun trades.**

## Architecture

- **Frontend**: Static HTML/CSS/JS in `public/`
- **Backend**: Vercel Node.js serverless functions in `api/`
- **Data**: Live on-chain via Solana RPC + pump.fun API

## Traders (Mainnet Pubkeys)

- **Blitz**: `2S4aMjsBk6YKD9UcfeXAfFfeeDA5hibst1UJfGpPnsqP`
- **Sage**: `7JeRYiNZpKn4yiVSp8EPPsiGwgxFiyNf3tT6zTf6Mzs8`
- **Hype**: `4Cio13C8gEeJZaWdwQQybMGhdu7zhaz6eCvHhyCrcEMK`
- **Hex**: `ArPxuqfoPT7TRHzr77rTEUQt1dUY4F2X7QFvGTSkeEtF`
- **Ghost**: `2NzdR2DWafucFV9NDPUcMM3GT8Lu2gXMWiZKEM2S39H9`

## API Endpoints

### Public (GET)
- `GET /api/leaderboard` — Live SOL balances + token bags from RPC
- `GET /api/tape` — Recent fills & pitches (signatures + in-memory)
- `GET /api/traders/:name` — Individual trader detail (blitz, sage, hype, hex, ghost)
- `GET /api/health` — Health check + RPC status

### Protected (POST, require `x-desk-key` header)
- `POST /api/pitches` — Record a pitch
- `POST /api/bags` — Record a bag position
- `POST /api/trade` — **Execute real pump.fun trade** (buy/sell)

## Environment Variables (Required for Vercel)

Set these in your Vercel project settings (Settings → Environment Variables):

```bash
# Solana RPC endpoint (required for live data)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# API key for protected endpoints
DESK_API_KEY=your_secret_api_key

# Max SOL per trade (safety cap)
MAX_SOL_PER_TRADE=0.05

# Trader wallet secrets (base58 OR JSON array format)
# NEVER commit these to the repo
BLITZ_SECRET=base58_or_json_array
SAGE_SECRET=base58_or_json_array
HYPE_SECRET=base58_or_json_array
HEX_SECRET=base58_or_json_array
GHOST_SECRET=base58_or_json_array
```

### Secret Key Formats

The `*_SECRET` env vars accept:
1. **Base58** (e.g. from Phantom export): `5J8...xyz`
2. **JSON array** (e.g. from Solana CLI): `[123,45,67,...]`

**NEVER commit private keys or `.env` files to this repository.**

## Local Development

```bash
npm install
npm run build
npm start
```

Open http://localhost:3456 (if using the Python server) or deploy to Vercel.

## Deployment (Vercel)

1. **Connect repo** to Vercel
2. **Set environment variables** (see above)
3. **Deploy** — Vercel will:
   - Run `node scripts/build.js` to generate static fallback JSONs
   - Serve `public/` as static files
   - Serve `api/` as Node.js serverless functions

## Trade Execution Flow

`POST /api/trade`:
1. Authenticate with `x-desk-key`
2. Load trader's secret from env (`BLITZ_SECRET`, etc.)
3. Call `https://pumpportal.fun/api/trade-local` with trade params
4. Deserialize unsigned transaction
5. Sign with trader's keypair
6. Send to Solana via RPC
7. Confirm + return signature + Solscan link

## Safety

- `MAX_SOL_PER_TRADE` caps each trade (default 0.05 SOL)
- Private keys never logged or exposed in responses
- Authentication required for all write operations

## Notes

- Trader pages work: `/blitz.html`, `/sage.html`, etc.
- The build script generates static JSON fallbacks in `public/api/` for development
- Live APIs in `/api` take precedence when deployed to Vercel

Do not commit wallet private keys.
