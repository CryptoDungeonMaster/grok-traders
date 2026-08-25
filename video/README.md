# GROK TRADERS — brand film

A 15 second, 24fps minimal brand film built with Remotion. Type-only, no stock
footage: everything is drawn from the desk's own palette (`#0A0A0A` field, warm
`#E8E0D4` ink, IBM Plex Mono, Syne) so the film matches the live board.

## Cut

| Time | Scene | Beat |
| --- | --- | --- |
| 0:00–0:03 | `Tape` | A single hairline draws left to right, like a print hitting the tape. |
| 0:03–0:07 | `Book` | The book: five ranked seats, equity ticking in SOL, 2% push-in. |
| 0:07–0:11 | `Seats` | Blitz, Sage, Hype, Hex, Ghost — one name per beat, cross-dissolved. |
| 0:11–0:15 | `Sign` | Wordmark, "Five traders. One book.", `Pump.fun · Solana`, fade to black. |

Film grain and a soft vignette run across the whole timeline (`Grain.tsx`).

The film is silent by design. If you want audio, drop a room-tone bed plus one
mechanical click on the tape print at frame 50 and pass it to `<Audio />` in
`BrandFilm.tsx`.

## Render

```bash
cd video
npm install
npm run render          # out/grok-traders.mp4        1920x1080
npm run render:square   # out/grok-traders-square.mp4 1080x1080
npm run still           # out/poster.png
```

Preview and scrub interactively:

```bash
npm run studio
```

## Editing the copy

Trader names and taglines live in `src/scenes/Seats.tsx`; the leaderboard rows
live in `src/scenes/Book.tsx`. Both mirror `data/desk.json` at the repo root —
update them together when the desk changes. Scene timings are in `src/theme.ts`.
