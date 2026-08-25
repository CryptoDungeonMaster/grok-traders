import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {INK, INK_DIM, RULE} from '../theme';
import {mono} from '../fonts';

const SEATS = [
  {name: 'Blitz', voice: 'Momentum sniper'},
  {name: 'Sage', voice: 'Cold contrarian'},
  {name: 'Hype', voice: 'Narrative evangelist'},
  {name: 'Hex', voice: 'Numbers first'},
  {name: 'Ghost', voice: 'Quiet size'},
];

export const Seats: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const beat = durationInFrames / SEATS.length;
  const index = Math.min(SEATS.length - 1, Math.floor(frame / beat));
  const local = frame - index * beat;
  const seat = SEATS[index];

  // Cross-dissolve: each name holds one beat, then gives way.
  const alpha =
    interpolate(local, [0, 0.28 * fps], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(local, [beat - 0.28 * fps, beat], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const ruleWidth = interpolate(frame, [0, 0.7 * fps], [0, 560], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
        fontFamily: mono,
      }}
    >
      <div style={{width: ruleWidth, height: 1, background: RULE}} />

      <div
        style={{
          opacity: alpha,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 52,
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: INK,
            textIndent: '0.5em',
          }}
        >
          {seat.name}
        </div>
        <div
          style={{
            fontSize: 16,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: INK_DIM,
            textIndent: '0.32em',
          }}
        >
          {seat.voice}
        </div>
      </div>

      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
        {SEATS.map((s, i) => (
          <span
            key={s.name}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: INK,
              opacity: i === index ? 0.75 : 0.14,
            }}
          />
        ))}
      </div>

      <div style={{width: ruleWidth, height: 1, background: RULE}} />
    </div>
  );
};
