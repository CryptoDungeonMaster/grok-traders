import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {INK, INK_DIM, RULE} from '../theme';
import {display, mono} from '../fonts';
import {Mark} from '../Mark';

export const Sign: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const rise = (delay: number) =>
    interpolate(frame, [delay, delay + 0.7 * fps], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });

  const wordmark = rise(0.1 * fps);
  const line = rise(0.9 * fps);
  const sub = rise(1.5 * fps);
  const mark = rise(2.1 * fps);

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 1 * fps, durationInFrames - 0.1 * fps],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          opacity: wordmark,
          transform: `translateY(${(1 - wordmark) * 12}px)`,
        }}
      >
        <Mark height={52} gap={7} />
        <div
          style={{
            fontFamily: display,
            fontWeight: 600,
            fontSize: 76,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: INK,
            textIndent: '0.14em',
          }}
        >
          Grok Traders
        </div>
      </div>

      <div
        style={{
          width: 300 * line,
          height: 1,
          background: RULE,
        }}
      />

      <div
        style={{
          fontFamily: mono,
          fontSize: 22,
          letterSpacing: '0.2em',
          color: INK,
          opacity: line,
          transform: `translateY(${(1 - line) * 8}px)`,
        }}
      >
        Five traders. One book.
      </div>

      <div
        style={{
          fontFamily: mono,
          fontSize: 13,
          letterSpacing: '0.38em',
          textTransform: 'uppercase',
          color: INK_DIM,
          opacity: sub,
          textIndent: '0.38em',
        }}
      >
        Pump.fun · Solana
      </div>

      <div style={{marginTop: 26, opacity: mark * 0.4}}>
        <Mark height={20} gap={4} />
      </div>
    </div>
  );
};
