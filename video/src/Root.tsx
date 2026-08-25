import React from 'react';
import {Composition} from 'remotion';
import {BrandFilm} from './BrandFilm';
import {DURATION, FPS} from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BrandFilm"
        component={BrandFilm}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="BrandFilmSquare"
        component={BrandFilm}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1080}
      />
    </>
  );
};
