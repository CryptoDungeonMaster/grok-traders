import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {INK, INK_DIM, INK_FAINT, RULE} from '../theme';
import {mono} from '../fonts';

type Row = {
  rank: string;
  trader: string;
  equity: number;
  drift: number;
  bag: string;
};

const ROWS: Row[] = [
  {rank: '01', trader: 'Hype', equity: 2.5, drift: 0.061, bag: 'OTTER'},
  {rank: '02', trader: 'Blitz', equity: 2.0, drift: 0.044, bag: 'APPLECAT'},
  {rank: '03', trader: 'Sage', equity: 1.5, drift: -0.028, bag: 'KERMIT'},
  {rank: '04', trader: 'Hex', equity: 0.0, drift: 0, bag: '—'},
  {rank: '05', trader: 'Ghost', equity: 0.0, drift: 0, bag: '—'},
];

const COLS = '64px 1fr 220px 230px';

export const Book: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  // The 2% push-in from the brief: locked-off, then a whisper of movement.
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.02]);

  const fade = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const out = interpolate(
    frame,
    [durationInFrames - 0.5 * fps, durationInFrames],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fade * out,
        transform: `scale(${scale})`,
      }}
    >
      <div style={{width: 1180, fontFamily: mono}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            paddingBottom: 24,
            borderBottom: `1px solid ${RULE}`,
          }}
        >
          <div
            style={{
              fontSize: 17,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: INK,
            }}
          >
            The book
          </div>
          <div
            style={{
              fontSize: 14,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: INK_DIM,
            }}
          >
            Desk · Unfunded
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLS,
            padding: '22px 0 16px',
            fontSize: 13,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: INK_FAINT,
          }}
        >
          <span>Rk</span>
          <span>Trader</span>
          <span style={{textAlign: 'right'}}>Equity</span>
          <span style={{textAlign: 'right'}}>Bag</span>
        </div>

        {ROWS.map((row, i) => {
          const enter = interpolate(
            frame,
            [0.35 * fps + i * 5, 0.35 * fps + i * 5 + 14],
            [0, 1],
            {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            },
          );

          // Slow, precise ticking. Values settle rather than jitter.
          const tick =
            row.drift *
            interpolate(frame, [0, durationInFrames], [0, 1], {
              easing: Easing.inOut(Easing.quad),
            });
          const value = (row.equity + tick).toFixed(3);

          return (
            <div
              key={row.trader}
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                alignItems: 'center',
                padding: '24px 0',
                borderTop: `1px solid ${RULE}`,
                fontSize: 22,
                color: INK,
                opacity: enter,
                transform: `translateY(${(1 - enter) * 8}px)`,
              }}
            >
              <span style={{color: INK_FAINT, fontSize: 15}}>{row.rank}</span>
              <span style={{letterSpacing: '0.06em'}}>{row.trader}</span>
              <span
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: row.equity === 0 ? INK_DIM : INK,
                }}
              >
                {value} SOL
              </span>
              <span
                style={{
                  textAlign: 'right',
                  fontSize: 16,
                  letterSpacing: '0.24em',
                  color: INK_DIM,
                }}
              >
                {row.bag}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
