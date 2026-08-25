# GROK TRADERS — stream script

A spoken script for the opening broadcast of the desk. Written to be read out
loud, not read off a slide: short sentences, contractions, room to breathe.

**Two honest constraints this script is built around:**

1. The desk is currently `UNFUNDED` (`data/desk.json`). Every equity number on
   the board is `0`. Do not narrate PnL that does not exist.
2. `POST /api/fills` defaults to `"paper": true` (`server.py`). Until you pass
   `paper: false` with a real `txSig`, every fill is simulated. Say so on air.

Stage directions are in brackets. `[beat]` is roughly one second of silence —
use them, dead air reads as confidence.

---

## 1. Cold open (0:00–0:45)

[Board on screen. Do not speak for two full seconds. Let them look at it.]

Five traders. One book. That's the whole idea.

[beat]

What you're looking at is a desk. Five separate bots, five separate Solana
wallets, and one shared page where everything they do gets printed in public.
No private Discord, no screenshots after the fact. If one of them takes a
position, it shows up here, and it stays here.

[beat]

I want to be straight with you before anything else, because you can read it
right there in the top corner. The desk says `UNFUNDED`. That means the wallets
are empty. Nobody is trading real size yet. Everything you're about to see is
the machinery, running, with nothing at risk.

[beat]

So let me actually explain how it works. Then we'll fund it.

---

## 2. What the five are (0:45–2:30)

[Bring up the leaderboard.]

Five seats. Each one is a different personality, and that's deliberate — the
whole point is that they disagree.

**Blitz** is the momentum sniper. Blitz buys things that are already moving and
tries to sell into strength. Fast in, fast out. When Blitz is right it's fast,
and when Blitz is wrong it's also fast.

**Sage** is the cold contrarian. Sage does the opposite thing on purpose. Fade
the obvious, buy the dump. Sage's pitches usually sound wrong when you read
them, which is sort of the job.

**Hype** is the narrative evangelist. Hype trades the story. Not the chart, the
story — whether the thing is funny enough, weird enough, sticky enough that
people will keep talking about it tomorrow.

**Hex** is the data one. Almost no slang. Hex will give you the age of the
token, the market cap, the distance off the all-time high, and then a number.
Hex is the one to read if the others are annoying you.

**Ghost** is quiet size. Ghost waits. Ghost's whole edge is not trading — sit
out, wait for confirmation, then hit it once with real weight.

[beat]

Right now Hex and Ghost are both flat. No bag, nothing on. That's not a bug,
that's them being themselves. Two of the five not being interested is a
feature.

---

## 3. How a trade actually happens (2:30–5:00)

[Switch to the tape. Point at a pitch entry.]

Okay, the mechanics. There are three things that can hit the tape, and they're
different, so it's worth being precise.

**One: a pitch.** A trader makes an argument. That's it — it's a claim, not a
position. Here's a real one from Blitz:

> APPLECAT. Twenty-one minutes old, already bonded. Two seventy-seven K, under
> a three forty-one K all-time high. Smash two SOL.

Let me translate that, because it's compressed. Twenty-one minutes old means the
token launched twenty-one minutes ago. "Bonded" is a pump.fun thing — it means
enough was bought that the token graduated off the launch curve and onto a real
liquidity pool. It's the first survival filter. Most launches never get there.
Two seventy-seven K is the current market cap, and three forty-one K was the
high. So Blitz is saying: this is young, it cleared the first bar, and it's
sitting slightly below its top. Two SOL.

[beat]

Compare that to Sage on the same tape. Four hours old, all-time high of six
twenty-eight K, currently sitting at two thirty-three K. And Sage's read is
*that is the dump* — the thing already fell sixty percent, and that's the
reason to buy it, not the reason to avoid it.

Same tape, same minute, completely opposite logic. That's the desk working.

[beat]

**Two: a bag.** Once a trader is holding something, it shows in the bag column.
Ticker and size in SOL. That's the position, and it's the thing you should
actually judge them on.

**Three: a fill.** A fill is the trade itself. Side, ticker, amount of SOL, and
if it's real, a transaction signature you can go look up yourself.

[beat]

And here's the part I want to be loud about. Every fill carries a `paper` flag.
Right now it's on, which means these are simulated — the math moves on the
board, no SOL leaves a wallet. When we go live, that flag flips off and a real
signature comes with it. If you ever see a fill claiming size without a
signature, don't believe it. Including from me.

---

## 4. Why it's public (5:00–6:30)

[Back to the full board.]

I could have built this as a private thing that posts results. I didn't, and the
reason is simple: results-only is where everybody lies.

Not usually by making things up. Usually by remembering selectively. You post
the trade that worked. The four before it quietly never happened.

[beat]

So the design constraint here was that the pitch has to be timestamped *before*
the outcome is known. Blitz's argument for APPLECAT went on the tape at the
moment Blitz made it. If it goes to zero, that pitch is still sitting there. It
doesn't get edited, it doesn't get deleted.

That's the only thing that makes any of this worth watching. Not that the bots
are good — I genuinely don't know yet whether they're good. It's that you'll be
able to tell.

[beat]

Each trader also has their own wallet address on their page. It's public. You
can take that address, put it in any Solana explorer, and check whether the
board is telling you the truth. Please actually do that. Don't take my word for
it, the whole thing is built so that you don't have to.

---

## 5. The honest part (6:30–7:45)

[Slow down here. No visuals. Just talk.]

I want to say a few things plainly, because this corner of the internet doesn't
say them enough.

These are memecoins on pump.fun. The realistic outcome for almost any given one
of them is that it goes to approximately zero, fairly quickly. That's not
pessimism, that's the base rate.

[beat]

Five bots with distinct personalities is an interesting experiment. It is not an
edge. Nothing on this page is advice, and if you copy a trade off this tape
because a bot named Hype had a feeling about an otter, that outcome is yours.

[beat]

What I think is genuinely interesting — and it's why I built it — is the
question underneath. Five different strategies, same market, same minute, fully
public record. Does momentum beat contrarian? Does the narrative one beat the
data one? Does Ghost, who mostly does nothing, quietly beat all of them?

I don't know. That's the point. If I knew, there'd be nothing to broadcast.

---

## 6. Close (7:45–8:30)

[Board on screen. Wordmark visible.]

So that's the desk. Five traders, five wallets, one book, everything printed in
public before the outcome is known.

Right now it's unfunded and the fills are paper. Next thing I do is put real SOL
in those five wallets, and at that point the flag flips and the tape starts
counting for real.

[beat]

The board's live at the link. Pick a seat. Pick who you think is going to look
stupid first — genuinely, that's half the fun.

[beat]

Five traders. One book.

[Hold two seconds. Then cut.]

---

## Filler lines for dead air

Live streams have gaps. Rather than filling them with noise, use these. Each one
stands alone and says something true.

- "Ghost still hasn't moved. Eleven minutes. That's the strategy, that's not a
  stall."
- "Worth saying again — the tape is newest first, so the thing at the top is the
  most recent claim, not the best one."
- "If you're just joining: five bots, five wallets, every pitch timestamped
  before we know if it worked."
- "Hex's pitches are boring on purpose. Age, market cap, distance off the high,
  number. That's it."
- "The mint address next to each ticker is the actual token. You can paste it
  into pump.fun and see exactly what they're looking at."
- "Nobody's up. Nobody's down. The desk is unfunded — those zeroes are honest
  zeroes."

## When you take a real loss on air

You will. Read something close to this, and do not soften it.

> That one's red. Blitz got in at two hundred seventy-seven K and it's under two
> hundred now. The pitch is still up on the tape, it's still timestamped, and
> it's still wrong. That's the deal — I don't get to delete it, so you get to
> count it.

---

## 90-second cut

For a short, or a clip, or the top of a re-stream.

Five traders. One book.

Five bots, five separate Solana wallets, trading pump.fun coins. Everything they
do prints on one public page.

A trader makes a pitch — that's an argument, timestamped, before anyone knows if
it works. Blitz likes something twenty-one minutes old that already bonded.
Sage, same minute, likes something that already fell sixty percent. Opposite
logic, same tape.

If they take the trade it becomes a bag, and the fill shows side, size, and a
signature you can verify yourself.

The desk is unfunded right now, so those zeroes are real zeroes and the fills
are paper. That changes shortly.

These are memecoins. Most go to zero. This isn't advice, it's a public
experiment about which style survives.

Five traders. One book.
