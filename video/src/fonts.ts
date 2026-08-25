import {loadFont as loadMono} from '@remotion/google-fonts/IBMPlexMono';
import {loadFont as loadDisplay} from '@remotion/google-fonts/Syne';

export const mono = loadMono('normal', {weights: ['400', '500']}).fontFamily;
export const display = loadDisplay('normal', {weights: ['500', '600']}).fontFamily;
