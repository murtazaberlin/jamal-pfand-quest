import Phaser from 'phaser';
import { ellipse, line, makeCanvas, px, registerCanvas, registerSheet, rng, shade } from './canvas';
import { OUT, THEMES } from './palette';
import { GAME_H } from '../config';

const BW = 512;
const H = GAME_H;

/** Gebänderter Himmelsverlauf mit Dithering an den Bandgrenzen. */
function skyBands(ctx: CanvasRenderingContext2D, colors: string[], w: number, h: number): void {
  const band = h / colors.length;
  for (let i = 0; i < colors.length; i++) {
    const y0 = Math.round(i * band);
    px(ctx, 0, y0, colors[i], w, Math.ceil(band) + 1);
    if (i + 1 < colors.length) {
      const yb = Math.round((i + 1) * band) - 3;
      for (let y = 0; y < 3; y++) {
        for (let x = (y % 2); x < w; x += 2 + y) px(ctx, x, yb + y, colors[i + 1]);
      }
    }
  }
}

function silhouette(ctx: CanvasRenderingContext2D, heights: (x: number) => number, color: string, w: number, top?: string): void {
  for (let x = 0; x < w; x++) {
    const y = Math.round(heights(x));
    px(ctx, x, y, color, 1, H - y);
    if (top) px(ctx, x, y, top, 1, 1);
  }
}

function saguaro(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, color: string): void {
  px(ctx, x, base - h, color, 5, h);
  px(ctx, x - 5, base - h * 0.6, color, 5, 3);
  px(ctx, x - 5, base - h * 0.9, color, 3, h * 0.3 + 1);
  px(ctx, x + 5, base - h * 0.45, color, 4, 3);
  px(ctx, x + 7, base - h * 0.75, color, 3, h * 0.3 + 1);
}

// ---------------- Welt 1: Desierto ----------------
function desert(): HTMLCanvasElement[] {
  const th = THEMES[0];
  const [c0, x0] = makeCanvas(BW, H);
  skyBands(x0, th.sky, BW, H);
  const r = rng(5);
  for (let i = 0; i < 40; i++) px(x0, Math.floor(r() * BW), Math.floor(r() * 50), '#f8e8ff');
  ellipse(x0, 300, 150, 34, 34, '#ffe890');
  ellipse(x0, 300, 150, 30, 30, '#fff4b8');
  for (let y = 136; y < 186; y += 5) px(x0, 260, y, th.sky[4], 80, 2);

  const [c1, x1] = makeCanvas(BW, H);
  const mesa = (x: number) => {
    const m = [[20, 90, 118], [150, 70, 128], [260, 110, 108], [400, 80, 124]];
    let y = 168;
    for (const [mx, mw, mh] of m) {
      const d = x - mx;
      if (d >= 0 && d < mw) y = Math.min(y, mh + (d < 8 ? 8 - d : d > mw - 8 ? d - (mw - 8) : 0) * 3);
    }
    return y;
  };
  silhouette(x1, mesa, '#6a2a4a', BW, '#a8486a');
  silhouette(x1, (x) => 170 + Math.sin(x * 0.02) * 6, '#7a3a48', BW);

  const [c2, x2] = makeCanvas(BW, H);
  silhouette(x2, (x) => 182 + Math.sin(x * 0.015 + 1) * 10 + Math.sin(x * 0.05) * 3, '#8a4430', BW, '#b86a40');
  for (const [cx, hh] of [[40, 40], [180, 26], [300, 46], [450, 30]]) saguaro(x2, cx, 196, hh, '#4a2430');
  return [c0, c1, c2];
}

// ---------------- Welt 2: Mercado ----------------
function mercado(): HTMLCanvasElement[] {
  const th = THEMES[1];
  const [c0, x0] = makeCanvas(BW, H);
  skyBands(x0, th.sky, BW, H);
  for (const [cx, cy] of [[60, 40], [220, 26], [400, 50]]) {
    ellipse(x0, cx, cy, 22, 7, '#ffffff');
    ellipse(x0, cx + 14, cy - 5, 12, 7, '#ffffff');
    ellipse(x0, cx - 6, cy + 3, 16, 4, '#e0ecf8');
  }
  // Kirche mit zwei Türmen
  const ch = '#8aa8c8';
  px(x0, 220, 100, ch, 80, 120);
  px(x0, 210, 70, ch, 20, 150);
  px(x0, 290, 70, ch, 20, 150);
  ellipse(x0, 220, 68, 10, 8, ch);
  ellipse(x0, 300, 68, 10, 8, ch);
  ellipse(x0, 260, 100, 22, 14, ch);
  px(x0, 259, 76, ch, 2, 12);
  px(x0, 255, 80, ch, 10, 2);

  const [c1, x1] = makeCanvas(BW, H);
  const houseCols = ['#f06a8a', '#f8c840', '#3ac0b0', '#f08a40', '#a070e0', '#60c060'];
  let hx = 0;
  const r = rng(11);
  while (hx < BW) {
    const w = 40 + Math.floor(r() * 30);
    const h = 60 + Math.floor(r() * 40);
    const col = houseCols[Math.floor(r() * houseCols.length)];
    const top = H - h - 30;
    px(x1, hx, top, shade(col, -0.25), w, h + 30);
    px(x1, hx + 2, top + 2, shade(col, -0.05), w - 4, h + 28);
    px(x1, hx, top, shade(col, 0.3), w, 3);
    for (let wy = top + 12; wy < H - 50; wy += 22) {
      for (let wx = hx + 8; wx < hx + w - 12; wx += 16) {
        px(x1, wx, wy, '#3a2a40', 8, 11);
        px(x1, wx, wy, '#f8e8a0', 8, 2);
      }
    }
    hx += w;
  }

  const [c2, x2] = makeCanvas(BW, H);
  // Papel-Picado-Girlanden
  for (const [gy, sag] of [[18, 10], [44, 8]]) {
    for (let x = 0; x < BW; x++) {
      const y = gy + Math.round(Math.sin((x / BW) * Math.PI * 4) ** 2 * sag);
      px(x2, x, y, '#3a2a40');
      if (x % 16 === 4) {
        const col = houseCols[(x / 16 + gy) % houseCols.length | 0];
        px(x2, x, y + 1, col, 10, 11);
        // ausgeschnittenes Muster
        px(x2, x + 2, y + 3, 'rgba(0,0,0,0)', 1, 1);
        x2.clearRect(x + 2, y + 4, 2, 2);
        x2.clearRect(x + 6, y + 4, 2, 2);
        x2.clearRect(x + 4, y + 7, 2, 2);
        for (let k = 0; k < 10; k += 2) x2.clearRect(x + k, y + 11, 1, 1);
      }
    }
  }
  return [c0, c1, c2];
}

// ---------------- Welt 3: La Mina ----------------
function mina(): HTMLCanvasElement[] {
  const th = THEMES[2];
  const [c0, x0] = makeCanvas(BW, H);
  skyBands(x0, th.sky, BW, H);
  const r = rng(23);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * BW), y = Math.floor(r() * H);
    px(x0, x, y, r() < 0.3 ? '#c8d0f0' : '#3a3048', 1 + Math.floor(r() * 2), 1);
  }
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(r() * BW), y = Math.floor(r() * H);
    line(x0, x, y, x + 20, y + 8, '#4a4060');
    px(x0, x + 10, y + 4, '#e8f0ff');
  }

  const [c1, x1] = makeCanvas(BW, H);
  // Stalaktiten oben, Felssäulen
  for (let x = 0; x < BW; x += 6) {
    const h = 10 + Math.floor(Math.abs(Math.sin(x * 0.13)) * 30 + r() * 10);
    for (let y = 0; y < h; y++) px(x1, x + Math.floor((y / h) * 3), y, '#241c30', 6 - Math.floor((y / h) * 6), 1);
  }
  for (const cx of [60, 250, 420]) {
    px(x1, cx, 0, '#1e1828', 34, H);
    px(x1, cx + 4, 0, '#2a2236', 8, H);
  }

  const [c2, x2] = makeCanvas(BW, H);
  for (const bx of [30, 286]) {
    px(x2, bx, 40, '#3a2410', 8, H - 40);
    px(x2, bx + 120, 40, '#3a2410', 8, H - 40);
    px(x2, bx - 6, 34, '#4a3018', 140, 8);
    px(x2, bx + 1, 40, '#5a3a1e', 2, H - 40);
    // Laterne
    const lx = bx + 64;
    line(x2, lx, 42, lx, 54, '#202020');
    px(x2, lx - 4, 54, OUT, 9, 10);
    px(x2, lx - 3, 55, '#f8c860', 7, 8);
    px(x2, lx - 1, 57, '#fff8d0', 3, 4);
  }
  return [c0, c1, c2];
}

// ---------------- Welt 4: Pirámide & Volcán ----------------
function piramide(): HTMLCanvasElement[] {
  const th = THEMES[3];
  const [c0, x0] = makeCanvas(BW, H);
  skyBands(x0, th.sky, BW, H);
  // Vulkan
  const vx = 330;
  silhouette(x0, (x) => {
    const d = Math.abs(x - vx);
    return d < 22 ? 70 : 70 + (d - 22) * 1.1;
  }, '#3a1418', BW, '#5a2420');
  px(x0, vx - 20, 68, '#f86018', 40, 3);
  px(x0, vx - 12, 66, '#fff070', 24, 2);
  const r = rng(31);
  for (let i = 0; i < 9; i++) ellipse(x0, vx - 10 + i * 4 + Math.floor(r() * 8), 56 - i * 6, 8 + i, 5 + i / 2, i < 3 ? '#6a3030' : '#5a2a2a');
  line(x0, vx, 70, vx - 30, 140, '#f86018', 2);
  line(x0, vx + 4, 70, vx + 26, 120, '#c84010', 2);

  const [c1, x1] = makeCanvas(BW, H);
  // Stufenpyramide
  const px0 = 110;
  for (let s = 0; s < 7; s++) {
    const w = 180 - s * 22;
    const y = 190 - s * 14;
    px(x1, px0 + (180 - w) / 2, y, '#5a3a2a', w, 14);
    px(x1, px0 + (180 - w) / 2, y, '#7a5238', w, 2);
  }
  px(x1, px0 + 74, 80, '#5a3a2a', 32, 14);
  px(x1, px0 + 84, 84, '#2a1810', 12, 10);
  px(x1, px0 + 82, 100, '#4a2e20', 16, 90);
  // Dschungel-Baumkronen
  for (let x = 0; x < BW; x += 18) {
    if (x > px0 - 10 && x < px0 + 180) continue;
    ellipse(x1, x, 180 + Math.sin(x) * 6, 14, 12, '#1a3a20');
    ellipse(x1, x + 6, 176, 8, 6, '#2a5a2a');
  }
  px(x1, 0, 186, '#1a3a20', BW, 30);

  const [c2, x2] = makeCanvas(BW, H);
  for (const bx of [40, 300]) {
    px(x2, bx, 70, OUT, 26, H - 70);
    px(x2, bx + 1, 71, '#6a5040', 24, H - 70);
    for (let y = 80; y < H; y += 18) {
      px(x2, bx + 4, y, '#4a3428', 18, 3);
      px(x2, bx + 8, y + 6, '#8a6a50', 10, 2);
    }
    px(x2, bx - 4, 62, OUT, 34, 10);
    px(x2, bx - 3, 63, '#8a6a50', 32, 8);
    // Ranken
    for (let i = 0; i < 4; i++) line(x2, bx + 3 + i * 6, 72, bx + 1 + i * 7, 110 + i * 10, '#2a7a3a');
  }
  return [c0, c1, c2];
}

// ---------------- Dekorationen (32x32-Frames) ----------------
function decorations(scene: Phaser.Scene): void {
  // Welt 1
  {
    const [c, ctx] = makeCanvas(128, 32);
    // Saguaro
    px(ctx, 13, 6, OUT, 7, 26); px(ctx, 14, 7, '#3a9a4a', 5, 25); px(ctx, 15, 7, '#7ad07a', 1, 25);
    px(ctx, 6, 14, OUT, 7, 5); px(ctx, 6, 8, OUT, 4, 10); px(ctx, 7, 9, '#3a9a4a', 2, 9); px(ctx, 7, 15, '#3a9a4a', 6, 3);
    px(ctx, 20, 18, OUT, 6, 5); px(ctx, 23, 12, OUT, 4, 10); px(ctx, 24, 13, '#3a9a4a', 2, 9); px(ctx, 20, 19, '#3a9a4a', 5, 3);
    // Fass-Kaktus mit Blüte
    ellipse(ctx, 48, 25, 8, 7, OUT); ellipse(ctx, 48, 25, 7, 6, '#3a9a4a');
    for (let x = 43; x < 54; x += 3) px(ctx, x, 20, '#226a34', 1, 10);
    px(ctx, 46, 17, '#ff4f8b', 4, 2); px(ctx, 47, 16, '#ffd23f', 2, 1);
    // Rinderschädel + Stein
    ellipse(ctx, 82, 27, 9, 5, '#8a7a6a');
    px(ctx, 74, 20, OUT, 10, 6); px(ctx, 75, 21, '#f0e8d8', 8, 4); px(ctx, 76, 22, OUT, 2, 1); px(ctx, 80, 22, OUT, 2, 1);
    px(ctx, 70, 19, '#f0e8d8', 4, 1); px(ctx, 84, 19, '#f0e8d8', 4, 1);
    // Agave
    for (let i = -4; i <= 4; i++) line(ctx, 112, 31, 112 + i * 3, 20 + Math.abs(i) * 2, i % 2 ? '#4a9a7a' : '#3a8a6a', 2);
    registerSheet(scene, 'deco0', c, 32, 32);
  }
  // Welt 2
  {
    const [c, ctx] = makeCanvas(128, 32);
    // Kisten
    px(ctx, 4, 14, OUT, 18, 18); px(ctx, 5, 15, '#c08a50', 16, 16); line(ctx, 5, 15, 20, 30, '#8a5a30'); px(ctx, 5, 22, '#8a5a30', 16, 1);
    // Blumentopf
    px(ctx, 40, 22, OUT, 12, 10); px(ctx, 41, 23, '#d0603a', 10, 8);
    ellipse(ctx, 46, 17, 6, 5, '#3a9a4a'); px(ctx, 43, 14, '#ff4f8b', 2, 2); px(ctx, 48, 15, '#ffd23f', 2, 2);
    // Fass
    px(ctx, 68, 12, OUT, 16, 20); px(ctx, 69, 13, '#9a6a3a', 14, 18); px(ctx, 69, 16, '#5a5a6a', 14, 2); px(ctx, 69, 26, '#5a5a6a', 14, 2);
    // Marktstand
    px(ctx, 97, 12, '#5a3a20', 2, 20); px(ctx, 125, 12, '#5a3a20', 2, 20);
    for (let i = 0; i < 8; i++) px(ctx, 96 + i * 4, 8, i % 2 ? '#ffffff' : '#e83a4a', 4, 6);
    px(ctx, 96, 22, OUT, 32, 3); px(ctx, 98, 18, '#f8a020', 4, 4); px(ctx, 104, 18, '#e83020', 4, 4); px(ctx, 110, 18, '#58c858', 4, 4); px(ctx, 116, 18, '#f8e040', 4, 4);
    registerSheet(scene, 'deco1', c, 32, 32);
  }
  // Welt 3
  {
    const [c, ctx] = makeCanvas(128, 32);
    // Laterne am Pfosten
    px(ctx, 15, 4, '#3a2410', 3, 28); px(ctx, 15, 4, '#5a3a1e', 10, 2);
    px(ctx, 21, 6, OUT, 7, 9); px(ctx, 22, 7, '#f8c860', 5, 7); px(ctx, 23, 9, '#fff8d0', 3, 3);
    // Kristalle
    for (const [x, h, col] of [[40, 14, '#c8d8ff'], [46, 20, '#e8f0ff'], [52, 12, '#a8b8e8']] as const) {
      for (let y = 0; y < h; y++) px(ctx, x - Math.floor(y / 5), 31 - y, col, 3 + Math.floor(y / 5) * 0, 1);
      px(ctx, x, 31 - h, '#ffffff');
    }
    // Erzhaufen
    ellipse(ctx, 80, 28, 11, 5, '#4a3e4e'); px(ctx, 74, 26, '#d8e0f0', 2, 1); px(ctx, 82, 24, '#f0f4ff', 2, 1); px(ctx, 86, 27, '#c8d0e0', 2, 1);
    // Spitzhacke
    line(ctx, 102, 31, 118, 14, '#6a4020', 2); line(ctx, 110, 12, 124, 20, '#a0a0b0', 2);
    registerSheet(scene, 'deco2', c, 32, 32);
  }
  // Welt 4
  {
    const [c, ctx] = makeCanvas(128, 32);
    // Fackel
    px(ctx, 14, 14, '#5a3a20', 4, 18); px(ctx, 12, 12, OUT, 8, 3);
    ellipse(ctx, 16, 8, 3, 5, '#f86018'); ellipse(ctx, 16, 9, 2, 3, '#fff070');
    // Steinkopf (Schlange)
    px(ctx, 36, 10, OUT, 24, 22); px(ctx, 37, 11, '#8a7058', 22, 20);
    px(ctx, 40, 15, OUT, 4, 4); px(ctx, 52, 15, OUT, 4, 4); px(ctx, 40, 24, '#5a4638', 16, 3);
    for (let x = 41; x < 56; x += 3) px(ctx, x, 27, '#f0e8d8', 1, 2);
    // Dschungelpflanze
    for (let i = -3; i <= 3; i++) line(ctx, 80, 31, 80 + i * 4, 14 + Math.abs(i) * 3, '#2a8a3a', 2);
    // Urne
    ellipse(ctx, 112, 24, 8, 8, OUT); ellipse(ctx, 112, 24, 7, 7, '#b8603a'); px(ctx, 108, 14, OUT, 8, 4); px(ctx, 105, 23, '#f0c048', 14, 2);
    registerSheet(scene, 'deco3', c, 32, 32);
  }
}

export function createBackgrounds(scene: Phaser.Scene): void {
  const all = [desert(), mercado(), mina(), piramide()];
  all.forEach((layers, w) => layers.forEach((cv, i) => registerCanvas(scene, `bg${w}-${i}`, cv)));
  decorations(scene);
}
