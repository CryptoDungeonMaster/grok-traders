import React from 'react';
import {INK} from './theme';

/**
 * Five strokes: one per seat on the desk. Drawn rather than bitmapped so it
 * sits on the black field without a matte edge.
 */
export const Mark: React.FC<{height?: number; color?: string; gap?: number}> = ({
  height = 34,
  color = INK,
  gap = 5,
}) => {
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap}}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: Math.max(2, Math.round(height / 14)),
            height: i === 2 ? height : height * 0.82,
            background: color,
          }}
        />
      ))}
    </div>
  );
};
