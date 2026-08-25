import React from 'react';
import {useCurrentFrame} from 'remotion';

/**
 * Analog grain plus a vignette. The turbulence seed advances every other frame
 * so the grain reads as film rather than a static texture.
 */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.055}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);

  return (
    <>
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(130% 100% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </>
  );
};
