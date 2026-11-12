import { Palette } from './canvas';

export const OUT = '#1b1022';

/** Jamal – Standard (Klein/Groß). */
export const JAMAL_PAL: Palette = {
  k: OUT,
  Y: '#f0c048', y: '#c08a28', o: '#fff2a8',
  r: '#d8283c', g: '#1f9a4a',
  s: '#d4935e', d: '#a3633c',
  m: '#2b1810',
  w: '#ffffff',
  R: '#d83a2a', G: '#239a48', W: '#f4e6c4', q: '#96202a',
  b: '#3a4a9a', n: '#26306a',
  B: '#6a3818', E: '#3f200c',
};

/** Feuer-Jamal: Charro-Sombrero schwarz-gold, Poncho rot-gold. */
export const JAMAL_FIRE: Palette = {
  ...JAMAL_PAL,
  Y: '#2e2438', y: '#17111d', o: '#5e4e6a',
  r: '#f0c040', g: '#c88a20',
  R: '#f4f0e8', G: '#e02818', W: '#f0c040', q: '#b0a8a0',
};

export const ZYROO_PAL: Palette = {
  k: OUT,
  s: '#b9c88f', S: '#8a9c66',
  h: '#3a2a20',
  n: '#e0706a', N: '#a8484a',
  w: '#f8f4e0',
  z: '#ddd3bb', x: '#9a9078',
  c: '#7a3a9a', C: '#4e2468',
  f: '#4a2a1a',
  p: '#a8b0b8', P: '#6a7078', l: '#e8eef4',
  Y: '#f2d040', y: '#b89020',
  v: '#f4f4d0',
};

export const SPIKY_SWAP: Palette = { z: '#5aa040', x: '#2e6a28', c: '#a04020', C: '#6a2814' };

export const CONFETTI_COLORS = [0xff4f8b, 0xffd23f, 0x3fd2ff, 0x5ce65c, 0xb36bff, 0xff8a3f];

export interface WorldTheme {
  name: string;
  sky: string[];
  ground: string;
  groundDark: string;
  groundTop: string;
  groundTopDark: string;
  plank: string;
  plankDark: string;
  bgColor: number;
}

export const THEMES: WorldTheme[] = [
  {
    name: 'Desierto',
    sky: ['#2a1a4a', '#5a2a6a', '#a8406a', '#e8705a', '#f8a858', '#ffd880'],
    ground: '#d89a58', groundDark: '#a86a38', groundTop: '#f0c878', groundTopDark: '#c89850',
    plank: '#a8683a', plankDark: '#6a3a1a', bgColor: 0x2a1a4a,
  },
  {
    name: 'Mercado',
    sky: ['#3a78c8', '#4a90d8', '#68a8e0', '#90c0e8', '#b8d8f0', '#e8f0f0'],
    ground: '#c0786a', groundDark: '#8a4a48', groundTop: '#e8c8a0', groundTopDark: '#b89870',
    plank: '#3aa8a0', plankDark: '#1a6a68', bgColor: 0x3a78c8,
  },
  {
    name: 'La Mina',
    sky: ['#0a0810', '#120e1a', '#1a1424', '#20182c', '#261c32', '#2c2038'],
    ground: '#5a4a5a', groundDark: '#3a2e3e', groundTop: '#8a7a88', groundTopDark: '#6a5a6a',
    plank: '#8a5a30', plankDark: '#523218', bgColor: 0x0a0810,
  },
  {
    name: 'Pirámide & Volcán',
    sky: ['#1a0a10', '#4a1018', '#8a2018', '#c84018', '#e87828', '#f8b048'],
    ground: '#8a7058', groundDark: '#5a4638', groundTop: '#b89a70', groundTopDark: '#8a7050',
    plank: '#6a8a58', plankDark: '#3a5a30', bgColor: 0x1a0a10,
  },
];
