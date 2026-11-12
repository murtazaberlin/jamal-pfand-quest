import Phaser from 'phaser';
import { line, makeCanvas, px, registerSheet, rng, shade } from './canvas';
import { OUT, THEMES, WorldTheme } from './palette';

/** Tile-Indizes im Tileset (je Welt eine Textur `tiles{w}`). */
export const T = {
  GROUND: 0, // 0..15: Autotile-Varianten (Maske: oben=1, rechts=2, unten=4, links=8)
  HARD: 16,
  BRICK: 17,
  PINATA: 18, // 18..20 Animation
  USED: 21,
  ONEWAY_L: 22,
  ONEWAY_M: 23,
  ONEWAY_R: 24,
  WELL_TL: 25,
  WELL_TR: 26,
  WELL_BL: 27,
  WELL_BR: 28,
  SPIKES: 29,
  LAVA_TOP: 30, // 30..31 Animation
  LAVA: 32,
  BACKWALL: 33,
  RAIL: 34,
  PILLAR: 35,
} as const;

const TS = 16;

function groundTile(ctx: CanvasRenderingContext2D, ox: number, oy: number, th: WorldTheme, mask: number, world: number): void {
  const up = mask & 1, right = mask & 2, down = mask & 4, left = mask & 8;
  const r = rng(1000 + mask * 7 + world * 101);
  px(ctx, ox, oy, th.ground, TS, TS);
  // Textur je Welt
  if (world === 1) {
    // Kopfsteinpflaster
    for (let y = 0; y < TS; y += 5) {
      const off = (y / 5) % 2 ? 3 : 0;
      for (let x = -off; x < TS; x += 7) {
        px(ctx, ox + Math.max(0, x), oy + y, th.groundDark, 1, 5);
        px(ctx, ox + Math.max(0, x), oy + y + 4, th.groundDark, Math.min(7, TS - Math.max(0, x)), 1);
        px(ctx, ox + Math.max(0, x) + 1, oy + y + 1, shade(th.ground, 0.15), 2, 1);
      }
    }
  } else if (world === 3) {
    // Steinquader
    for (let y = 0; y < TS; y += 8) {
      px(ctx, ox, oy + y + 7, th.groundDark, TS, 1);
      const off = (y / 8) % 2 ? 8 : 0;
      px(ctx, ox + off, oy + y, th.groundDark, 1, 8);
      px(ctx, ox + off + 1, oy + y, shade(th.ground, 0.12), 6, 1);
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(r() * TS), y = Math.floor(r() * TS);
      px(ctx, ox + x, oy + y, r() < 0.5 ? th.groundDark : shade(th.ground, 0.15), r() < 0.3 ? 2 : 1, 1);
    }
    if (world === 2) {
      for (let i = 0; i < 2; i++) {
        const x = Math.floor(r() * 13), y = Math.floor(r() * 13);
        px(ctx, ox + x, oy + y, '#c8d0e8', 2, 1);
        px(ctx, ox + x + 1, oy + y + 1, '#ffffff', 1, 1);
      }
    }
  }
  if (!up) {
    px(ctx, ox, oy, th.groundTop, TS, 5);
    px(ctx, ox, oy + 4, th.groundTopDark, TS, 1);
    for (let x = 0; x < TS; x += 3) px(ctx, ox + x, oy + 5, th.groundTopDark, 1, 1 + (x % 2));
    px(ctx, ox, oy, OUT, TS, 1);
    px(ctx, ox, oy + 1, shade(th.groundTop, 0.3), TS, 1);
    if (world === 0) {
      px(ctx, ox + 3, oy + 2, th.groundTopDark, 2, 1);
      px(ctx, ox + 11, oy + 3, th.groundTopDark, 1, 1);
    }
  }
  if (!left) px(ctx, ox, oy, OUT, 1, TS);
  if (!right) px(ctx, ox + TS - 1, oy, OUT, 1, TS);
  if (!down) px(ctx, ox, oy + TS - 1, OUT, TS, 1);
}

function hardBlock(ctx: CanvasRenderingContext2D, ox: number, oy: number, base: string): void {
  px(ctx, ox, oy, OUT, TS, TS);
  px(ctx, ox + 1, oy + 1, base, 14, 14);
  px(ctx, ox + 1, oy + 1, shade(base, 0.35), 14, 2);
  px(ctx, ox + 1, oy + 1, shade(base, 0.35), 2, 14);
  px(ctx, ox + 1, oy + 13, shade(base, -0.35), 14, 2);
  px(ctx, ox + 13, oy + 1, shade(base, -0.35), 2, 14);
  px(ctx, ox + 5, oy + 5, shade(base, -0.15), 6, 6);
}

function brick(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const b = '#d07a48', d = '#8a4628', l = '#f0a070';
  px(ctx, ox, oy, d, TS, TS);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0;
    for (let x = -off; x < TS; x += 8) {
      const x0 = Math.max(0, x);
      const w = Math.min(x + 7, TS) - x0;
      if (w <= 0) continue;
      px(ctx, ox + x0, oy + row * 4, b, w, 3);
      px(ctx, ox + x0, oy + row * 4, l, w, 1);
    }
  }
  px(ctx, ox, oy, OUT, TS, 1);
  px(ctx, ox, oy + TS - 1, OUT, TS, 1);
  px(ctx, ox, oy, OUT, 1, TS);
  px(ctx, ox + TS - 1, oy, OUT, 1, TS);
}

function pinata(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number): void {
  const cols = ['#ff4f8b', '#ffd23f', '#3fd2ff', '#5ce65c', '#b36bff'];
  px(ctx, ox, oy, OUT, TS, TS);
  for (let i = 0; i < 5; i++) {
    const c = cols[(i + frame) % cols.length];
    const y = oy + 1 + i * 3;
    px(ctx, ox + 1, y, c, 14, 3);
    // Fransen
    for (let x = 1; x < 15; x += 2) px(ctx, ox + x, y + 2, shade(c, -0.3), 1, 1);
  }
  // Emblem: Stern
  const sx = ox + 8, sy = oy + 8;
  px(ctx, sx - 1, sy - 4, OUT, 2, 8);
  px(ctx, sx - 4, sy - 1, OUT, 8, 2);
  px(ctx, sx - 2, sy - 2, OUT, 4, 4);
  px(ctx, sx - 1, sy - 3, '#ffffff', 2, 6);
  px(ctx, sx - 3, sy - 1 + 0, '#ffffff', 6, 2);
  // Glanz
  if (frame === 1) px(ctx, ox + 2, oy + 2, '#ffffff', 2, 1);
  px(ctx, ox + 1, oy + 1, 'rgba(255,255,255,0.6)', 1, 1);
}

function used(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  px(ctx, ox, oy, OUT, TS, TS);
  px(ctx, ox + 1, oy + 1, '#9a6a48', 14, 14);
  px(ctx, ox + 1, oy + 1, '#b88a60', 14, 1);
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) px(ctx, ox + x, oy + y, '#5a3a20', 1, 1);
  // zerrissene Papierfransen
  for (let x = 2; x < 14; x += 3) px(ctx, ox + x, oy + 7, '#7a4a30', 2, 1);
}

function oneWay(ctx: CanvasRenderingContext2D, ox: number, oy: number, th: WorldTheme, part: number): void {
  px(ctx, ox, oy, OUT, TS, 6);
  px(ctx, ox, oy + 1, th.plank, TS, 3);
  px(ctx, ox, oy + 4, th.plankDark, TS, 1);
  px(ctx, ox, oy + 1, shade(th.plank, 0.3), TS, 1);
  if (part === 0) px(ctx, ox, oy, OUT, 1, 6);
  if (part === 2) px(ctx, ox + 15, oy, OUT, 1, 6);
  // Stütze
  if (part !== 1) {
    const x = part === 0 ? ox + 2 : ox + 12;
    line(ctx, x, oy + 6, x + (part === 0 ? 4 : -4), oy + 12, th.plankDark, 2);
  }
  for (let x = 4; x < TS; x += 8) px(ctx, ox + x, oy + 2, th.plankDark, 1, 1);
}

function well(ctx: CanvasRenderingContext2D, ox: number, oy: number, part: number): void {
  const st = '#a8a0a0', sd = '#6a6268', sl = '#d0c8c8';
  if (part < 2) {
    // Oberer Rand mit Öffnung
    px(ctx, ox, oy, OUT, TS, TS);
    px(ctx, ox + (part === 0 ? 1 : 0), oy + 1, st, part === 0 ? 15 : 15, 6);
    px(ctx, ox + (part === 0 ? 1 : 0), oy + 1, sl, 15, 1);
    px(ctx, ox + (part === 0 ? 5 : 0), oy + 3, '#120a18', part === 0 ? 11 : 11, 3);
    px(ctx, ox + (part === 0 ? 1 : 0), oy + 8, st, 15, 7);
    for (let x = (part === 0 ? 2 : 0); x < 15; x += 5) px(ctx, ox + x, oy + 8, sd, 1, 7);
    px(ctx, ox, oy + 11, sd, TS, 1);
  } else {
    px(ctx, ox, oy, OUT, TS, TS);
    px(ctx, ox + (part === 2 ? 2 : 0), oy, st, 14, TS);
    for (let y = 0; y < TS; y += 5) {
      px(ctx, ox + (part === 2 ? 2 : 0), oy + y, sd, 14, 1);
      const off = (y / 5) % 2 ? 3 : 7;
      px(ctx, ox + off, oy + y, sd, 1, 5);
    }
  }
}

function spikes(ctx: CanvasRenderingContext2D, ox: number, oy: number, th: WorldTheme): void {
  px(ctx, ox, oy + 12, OUT, TS, 4);
  px(ctx, ox, oy + 13, th.groundDark, TS, 3);
  for (let i = 0; i < 4; i++) {
    const x = ox + i * 4;
    for (let y = 0; y < 8; y++) {
      const w = Math.max(1, Math.round((y / 7) * 3));
      px(ctx, x + 2 - Math.floor(w / 2), oy + 5 + y, y === 0 ? '#ffffff' : '#c8c8d8', w, 1);
    }
    px(ctx, x + 2, oy + 4, OUT, 1, 1);
  }
}

function lava(ctx: CanvasRenderingContext2D, ox: number, oy: number, top: boolean, frame: number): void {
  px(ctx, ox, oy, '#c82810', TS, TS);
  for (let i = 0; i < 4; i++) px(ctx, ox + ((i * 5 + frame * 3) % 14), oy + 6 + i * 3, '#f86018', 3, 1);
  if (top) {
    px(ctx, ox, oy, 'rgba(0,0,0,0)', TS, 4);
    ctx.clearRect(ox, oy, TS, 5);
    for (let x = 0; x < TS; x++) {
      const h = 3 + Math.round(Math.sin((x + frame * 4) * 0.8) * 1.5);
      px(ctx, ox + x, oy + 5 - h + 2, '#f8a020', 1, h);
      px(ctx, ox + x, oy + 5 - h + 2, '#fff070', 1, 1);
    }
  }
}

function tileset(scene: Phaser.Scene, world: number): void {
  const th = THEMES[world];
  const [c, ctx] = makeCanvas(TS * 16, TS * 3);
  const at = (i: number): [number, number] => [(i % 16) * TS, Math.floor(i / 16) * TS];
  for (let m = 0; m < 16; m++) groundTile(ctx, ...at(T.GROUND + m), th, m, world);
  hardBlock(ctx, ...at(T.HARD), ['#c08a5a', '#a87a8a', '#7a7a8a', '#9a8a6a'][world]);
  brick(ctx, ...at(T.BRICK));
  for (let f = 0; f < 3; f++) pinata(ctx, ...at(T.PINATA + f), f);
  used(ctx, ...at(T.USED));
  oneWay(ctx, ...at(T.ONEWAY_L), th, 0);
  oneWay(ctx, ...at(T.ONEWAY_M), th, 1);
  oneWay(ctx, ...at(T.ONEWAY_R), th, 2);
  well(ctx, ...at(T.WELL_TL), 0);
  well(ctx, ...at(T.WELL_TR), 1);
  well(ctx, ...at(T.WELL_BL), 2);
  well(ctx, ...at(T.WELL_BR), 3);
  spikes(ctx, ...at(T.SPIKES), th);
  lava(ctx, ...at(T.LAVA_TOP), true, 0);
  lava(ctx, ...at(T.LAVA_TOP + 1), true, 1);
  lava(ctx, ...at(T.LAVA), false, 0);
  // Rückwand (Bonusraum, nicht fest)
  {
    const [x, y] = at(T.BACKWALL);
    px(ctx, x, y, shade(th.groundDark, -0.45), TS, TS);
    px(ctx, x, y + 7, shade(th.groundDark, -0.6), TS, 1);
    px(ctx, x + 7, y, shade(th.groundDark, -0.6), 1, 7);
    px(ctx, x + 3, y + 8, shade(th.groundDark, -0.6), 1, 8);
  }
  // Schiene (Deko)
  {
    const [x, y] = at(T.RAIL);
    px(ctx, x, y + 12, '#5a3a20', TS, 3);
    px(ctx, x + 3, y + 11, '#3a2410', 3, 5);
    px(ctx, x + 11, y + 11, '#3a2410', 3, 5);
    px(ctx, x, y + 10, '#b8c0d0', TS, 2);
  }
  // Säule (Deko)
  {
    const [x, y] = at(T.PILLAR);
    px(ctx, x + 3, y, shade(th.groundDark, -0.3), 10, TS);
    px(ctx, x + 4, y, shade(th.ground, -0.2), 3, TS);
  }
  registerSheet(scene, `tiles${world}`, c, TS, TS);
}

export function createTiles(scene: Phaser.Scene): void {
  for (let w = 0; w < 4; w++) tileset(scene, w);
}
