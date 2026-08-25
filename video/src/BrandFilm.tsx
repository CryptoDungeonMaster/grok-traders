import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {BG, SCENES} from './theme';
import {Grain} from './Grain';
import {Tape} from './scenes/Tape';
import {Book} from './scenes/Book';
import {Seats} from './scenes/Seats';
import {Sign} from './scenes/Sign';

export const BrandFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <Sequence from={SCENES.tape.from} durationInFrames={SCENES.tape.duration}>
        <Tape />
      </Sequence>
      <Sequence from={SCENES.book.from} durationInFrames={SCENES.book.duration}>
        <Book />
      </Sequence>
      <Sequence from={SCENES.seats.from} durationInFrames={SCENES.seats.duration}>
        <Seats />
      </Sequence>
      <Sequence from={SCENES.sign.from} durationInFrames={SCENES.sign.duration}>
        <Sign />
      </Sequence>
      <Grain />
    </AbsoluteFill>
  );
};
