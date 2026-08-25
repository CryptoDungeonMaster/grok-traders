import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {INK, INK_DIM} from '../theme';
import {mono} from '../fonts';

export const Tape: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const draw = interpolate(frame, [0.35 * fps, 2.1 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  const label = interpolate(frame, [1.7 * fps, 2.3 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const out = interpolate(
    frame,
    [durationInFrames - 0.4 * fps, durationInFrames],
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
        opacity: out,
      }}
    >
      <div style={{width: 1180, height: 1, position: 'relative'}}>
        <div
          style={{
            height: 1,
            width: `${draw * 100}%`,
            background: `linear-gradient(90deg, rgba(232,224,212,0.06), ${INK})`,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 17,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: INK_DIM,
          opacity: label,
        }}
      >
        The tape opens
      </div>
    </div>
  );
};
