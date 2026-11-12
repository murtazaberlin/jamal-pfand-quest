import Phaser from 'phaser';
import { Palette, drawRows, ellipse, ellipseOutlined, line, makeCanvas, px, registerCanvas, registerSheet, rng, swapPalette } from './canvas';
import { JAMAL_FIRE, JAMAL_PAL, OUT, SPIKY_SWAP, ZYROO_PAL } from './palette';
import * as D from './spriteData';

// ============================================================
// JAMAL
// ============================================================

type Arm = 'none' | 'up' | 'fwd';
interface JPose {
  bob?: number;
  headDx?: number;
  legs?: [number, number, number, number]; // lFootX, lLift, rFootX, rLift
  eyes?: 'open' | 'closed';
  arm?: Arm;
  hatLift?: number;
  duck?: boolean;
}

export const JAMAL_FRAMES = {
  idle: 0, idle2: 1, run0: 2, run1: 3, run2: 4, jump: 5, fall: 6, skid: 7, duck: 8,
  hurt: 9, win: 10, dead: 11, throw: 12, slide: 13,
} as const;

const SMALL_POSES: JPose[] = [
  { legs: [5, 0, 9, 0] },
  { legs: [5, 0, 9, 0], eyes: 'closed', bob: 0 },
  { legs: [3, 0, 11, 0], bob: 0 },
  { legs: [6, 1, 8, 0], bob: 1 },
  { legs: [4, 0, 10, 1], bob: 0 },
  { legs: [4, 1, 10, 0], arm: 'up' },
  { legs: [5, 0, 9, 0] },
  { legs: [7, 0, 11, 0], headDx: -1, arm: 'fwd' },
  { duck: true },
  { legs: [5, 0, 9, 0], eyes: 'closed', hatLift: 2 },
  { legs: [5, 0, 9, 0], arm: 'up' },
  { legs: [4, 1, 10, 1], eyes: 'closed', hatLift: 1, arm: 'up' },
  { legs: [5, 0, 9, 0], arm: 'fwd' },
  { legs: [6, 1, 9, 0], arm: 'fwd' },
];

const BIG_POSES: JPose[] = [
  { legs: [5, 0, 9, 0] },
  { legs: [5, 0, 9, 0], eyes: 'closed' },
  { legs: [2, 0, 11, 0] },
  { legs: [6, 2, 8, 0], bob: 1 },
  { legs: [3, 0, 10, 2] },
  { legs: [3, 3, 10, 0], arm: 'up' },
  { legs: [4, 0, 10, 1] },
  { legs: [8, 0, 11, 0], headDx: -1, arm: 'fwd' },
  { duck: true },
  { legs: [5, 0, 9, 0], eyes: 'closed', hatLift: 3 },
  { legs: [5, 0, 9, 0], arm: 'up' },
  { legs: [3, 2, 10, 2], eyes: 'closed', hatLift: 2, arm: 'up' },
  { legs: [5, 0, 9, 0], arm: 'fwd' },
  { legs: [6, 2, 9, 0], arm: 'fwd' },
];

function closeEyes(rows: readonly string[]): string[] {
  return rows.map((r) => r.replace('swk', 'kkk'));
}

function drawLegsSmall(ctx: CanvasRenderingContext2D, pal: Palette, ox: number, oy: number, l: number[]): void {
  const [lx, ll, rx, rl] = l;
  for (const [x, lift] of [[lx, ll], [rx, rl]]) {
    if (lift === 0) px(ctx, ox + x, oy + 14, pal.n);
    px(ctx, ox + x, oy + 15 - lift, pal.B, 2, 1);
    px(ctx, ox + x - 1, oy + 15 - lift, OUT, 1, 1);
  }
}

function drawLegsBig(ctx: CanvasRenderingContext2D, pal: Palette, ox: number, oy: number, l: number[]): void {
  const [lx, ll, rx, rl] = l;
  const hips = [5, 9];
  [[lx, ll], [rx, rl]].forEach(([fx, lift], i) => {
    const hipX = hips[i];
    const footY = 29 - lift;
    for (let y = 25; y <= footY; y++) {
      const t = (y - 25) / Math.max(1, footY - 25);
      const x = Math.round(hipX + (fx - hipX) * t);
      px(ctx, ox + x - 1, oy + y, OUT);
      px(ctx, ox + x, oy + y, pal.b);
      px(ctx, ox + x + 1, oy + y, pal.n);
      px(ctx, ox + x + 2, oy + y, OUT);
    }
    px(ctx, ox + fx - 1, oy + footY + 1, OUT);
    px(ctx, ox + fx, oy + footY + 1, pal.B, 3, 1);
    px(ctx, ox + fx + 3, oy + footY + 1, OUT);
    px(ctx, ox + fx - 1, oy + footY + 2, pal.E, 5, 1);
  });
}

function drawArm(ctx: CanvasRenderingContext2D, pal: Palette, ox: number, oy: number, arm: Arm, big: boolean, bob: number): void {
  if (arm === 'none') return;
  if (big) {
    const sy = oy + 16 + bob;
    if (arm === 'up') {
      px(ctx, ox + 13, sy - 4, OUT, 3, 6);
      px(ctx, ox + 14, sy - 3, pal.R, 1, 4);
      px(ctx, ox + 13, sy - 7, OUT, 3, 3);
      px(ctx, ox + 14, sy - 6, pal.s, 1, 2);
    } else {
      px(ctx, ox + 12, sy, OUT, 4, 4);
      px(ctx, ox + 13, sy + 1, pal.R, 2, 2);
      px(ctx, ox + 15, sy + 1, pal.s, 1, 2);
    }
  } else {
    const sy = oy + 10 + bob;
    if (arm === 'up') {
      px(ctx, ox + 13, sy - 3, OUT, 3, 4);
      px(ctx, ox + 14, sy - 2, pal.s, 1, 1);
      px(ctx, ox + 14, sy - 1, pal.R, 1, 2);
    } else {
      px(ctx, ox + 12, sy, OUT, 4, 3);
      px(ctx, ox + 13, sy + 1, pal.R, 2, 1);
      px(ctx, ox + 15, sy + 1, pal.s, 1, 1);
    }
  }
}

function drawJamal(ctx: CanvasRenderingContext2D, pal: Palette, ox: number, oy: number, big: boolean, p: JPose): void {
  const bob = p.bob ?? 0;
  const hdx = p.headDx ?? 0;
  const face = p.eyes === 'closed' ? closeEyes(big ? D.J_FACE_B : D.J_FACE_S) : big ? D.J_FACE_B : D.J_FACE_S;
  const hat = big ? D.J_HAT_B : D.J_HAT_S;
  const body = big ? D.J_BODY_B : D.J_BODY_S;
  if (p.duck) {
    if (big) {
      drawRows(ctx, [body[0], body[1], body[3], body[5], body[9]], pal, ox, oy + 27);
      drawRows(ctx, face, pal, ox, oy + 20);
      drawRows(ctx, hat, pal, ox, oy + 12);
    } else {
      drawRows(ctx, [body[0], body[3]], pal, ox, oy + 14);
      drawRows(ctx, face, pal, ox, oy + 10);
      drawRows(ctx, hat, pal, ox, oy + 4);
    }
    return;
  }
  const hatH = hat.length;
  const faceH = face.length;
  const bodyY = hatH + faceH;
  if (big) drawLegsBig(ctx, pal, ox, oy, p.legs ?? [5, 0, 9, 0]);
  else drawLegsSmall(ctx, pal, ox, oy, p.legs ?? [5, 0, 9, 0]);
  drawRows(ctx, body, pal, ox, oy + bodyY + bob);
  drawRows(ctx, face, pal, ox + hdx, oy + hatH + bob);
  drawRows(ctx, hat, pal, ox + hdx, oy + bob - (p.hatLift ?? 0));
  drawArm(ctx, pal, ox, oy, p.arm ?? 'none', big, bob);
}

function jamalSheet(scene: Phaser.Scene, key: string, pal: Palette, big: boolean): void {
  const poses = big ? BIG_POSES : SMALL_POSES;
  const h = big ? 32 : 16;
  const [c, ctx] = makeCanvas(16 * poses.length, h);
  poses.forEach((p, i) => drawJamal(ctx, pal, i * 16, 0, big, p));
  registerSheet(scene, key, c, 16, h);
}

// ============================================================
// ZYROO
// ============================================================

function zyrooSheets(scene: Phaser.Scene): void {
  const pal = ZYROO_PAL;
  // Läufer: walk0, walk1, flat, throwHold, throwRelease
  {
    const [c, ctx] = makeCanvas(16 * 5, 16);
    drawRows(ctx, D.Z_WALK0, pal, 0, 0);
    drawRows(ctx, D.Z_WALK1, pal, 16, 0);
    drawRows(ctx, D.Z_FLAT, pal, 32, 0);
    drawRows(ctx, D.Z_WALK0, pal, 48, 0);
    // Hand mit Banane über dem Kopf
    px(ctx, 48 + 11, 0, OUT, 4, 4);
    px(ctx, 48 + 12, 1, pal.s, 2, 2);
    px(ctx, 48 + 12, 0, pal.Y, 3, 1);
    px(ctx, 48 + 14, 0, pal.y, 1, 1);
    drawRows(ctx, D.Z_WALK1, pal, 64, 0);
    px(ctx, 64 + 12, 5, OUT, 4, 3);
    px(ctx, 64 + 13, 6, pal.s, 2, 1);
    registerSheet(scene, 'zyroo', c, 16, 16);
  }
  // Panzer-ZYROO: walk0, walk1, shell, spin1, spin2, peek
  {
    const [c, ctx] = makeCanvas(16 * 6, 16);
    drawRows(ctx, D.Z_WALK0, pal, 0, 0);
    drawRows(ctx, D.POT_BACK, pal, 0, 4);
    drawRows(ctx, D.Z_WALK1, pal, 16, 0);
    drawRows(ctx, D.POT_BACK, pal, 16, 5);
    drawRows(ctx, D.POT_SHELL, pal, 32, 0);
    drawRows(ctx, D.POT_SHELL2, pal, 48, 0);
    drawRows(ctx, D.POT_SHELL3, pal, 64, 0);
    drawRows(ctx, D.POT_PEEK, pal, 80, 0);
    registerSheet(scene, 'zyroo-pot', c, 16, 16);
  }
  // Flieger: 3 Propeller-Frames
  {
    const [c, ctx] = makeCanvas(16 * 3, 16);
    for (let i = 0; i < 3; i++) {
      const head = D.Z_WALK0.slice(0, 12);
      drawRows(ctx, head, pal, i * 16, 3);
      px(ctx, i * 16 + 7, 1, pal.x, 2, 3);
      drawRows(ctx, [D.FLY_BLADES[i]], pal, i * 16, 0);
      drawRows(ctx, [D.FLY_BLADES[i]], pal, i * 16, 1);
    }
    registerSheet(scene, 'zyroo-fly', c, 16, 16);
  }
  // Stachel-ZYROO
  {
    const sp = swapPalette(pal, SPIKY_SWAP);
    const [c, ctx] = makeCanvas(32, 16);
    drawRows(ctx, D.Z_WALK0, sp, 0, 0);
    drawRows(ctx, D.Z_WALK1, sp, 16, 0);
    const spikes = [[1, 8], [1, 10], [14, 8], [14, 10], [14, 12], [2, 12], [5, 14], [10, 15], [3, 6], [13, 6]];
    for (let f = 0; f < 2; f++) {
      for (const [x, y] of spikes) px(ctx, f * 16 + x + (y > 10 ? f : 0), y, pal.v);
    }
    registerSheet(scene, 'zyroo-spike', c, 16, 16);
  }
}

// ============================================================
// MEGA-ZYROO (Boss) – prozedural, 64x56 pro Frame
// ============================================================

export const BOSS_W = 64;
export const BOSS_H = 56;

function drawBoss(ctx: CanvasRenderingContext2D, ox: number, frame: number, variant: number): void {
  const pal = ZYROO_PAL;
  const crown = ['#f2d040', '#c0c8d0', '#e05030', '#f8a020'][variant];
  const cloak = ['#7a3a9a', '#2a6a9a', '#5a5a6a', '#9a2a2a'][variant];
  const cloakD = ['#4e2468', '#1a4068', '#3a3a48', '#5e1414'][variant];
  const cx = ox + 32;
  const sway = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  const hurt = frame === 4;
  const skin = hurt ? '#ffffff' : pal.s;
  // Füße
  ellipseOutlined(ctx, cx - 10 + (frame === 1 ? -2 : 0), 52, 6, 3, pal.f, OUT);
  ellipseOutlined(ctx, cx + 10 + (frame === 1 ? 2 : 0), 52, 6, 3, pal.f, OUT);
  // Körper/Umhang
  ellipseOutlined(ctx, cx, 38, 17, 13, cloak, OUT);
  ellipse(ctx, cx - 6, 41, 9, 8, cloakD);
  // Arme
  if (frame === 2 || frame === 3) {
    line(ctx, cx + 14, 32, cx + 24, 18, OUT, 4);
    line(ctx, cx + 15, 32, cx + 23, 19, cloak, 2);
    ellipseOutlined(ctx, cx + 24, 17, 3, 3, skin, OUT);
  } else {
    ellipseOutlined(ctx, cx + 17, 40, 3, 3, skin, OUT);
    ellipseOutlined(ctx, cx - 17, 40, 3, 3, skin, OUT);
  }
  // Kopf
  ellipseOutlined(ctx, cx, 17, 13, 12, skin, OUT);
  ellipse(ctx, cx - 6, 18, 5, 9, hurt ? '#ffffff' : pal.S);
  // Krone
  for (let i = -2; i <= 2; i++) {
    px(ctx, cx + i * 4 - 2, 2, OUT, 5, 5);
    px(ctx, cx + i * 4 - 1, 3, crown, 3, 4);
  }
  px(ctx, cx - 11, 5, OUT, 23, 3);
  px(ctx, cx - 10, 6, crown, 21, 1);
  // Augenbrauen (buschig, grimmig)
  for (let i = 0; i < 8; i++) {
    px(ctx, cx - 10 + i, 9 + Math.floor(i / 3), pal.h, 1, 3);
    px(ctx, cx + 3 + i, 11 - Math.floor(i / 3), pal.h, 1, 3);
  }
  // Augen
  px(ctx, cx - 8, 13, pal.w, 4, 3);
  px(ctx, cx + 4, 13, pal.w, 4, 3);
  px(ctx, cx - 6, 14, hurt ? OUT : '#d02020', 2, 2);
  px(ctx, cx + 6, 14, hurt ? OUT : '#d02020', 2, 2);
  // Knollennase
  ellipseOutlined(ctx, cx + 2, 20, 5, 4, pal.n, OUT);
  px(ctx, cx + 3, 18, '#ffb0a0', 2, 1);
  // Mund mit schiefen Zähnen
  const mouthOpen = frame === 5;
  px(ctx, cx - 6, 25, OUT, 13, mouthOpen ? 6 : 3);
  if (mouthOpen) px(ctx, cx - 5, 27, '#a01818', 11, 3);
  [[-5, 0], [-2, 1], [1, 0], [4, 1]].forEach(([dx, dy]) => px(ctx, cx + dx, 25 + dy, pal.w, 2, 2));
  // Absurd langer zotteliger Bart
  const r = rng(77 + frame);
  for (let s = 0; s < 22; s++) {
    const sx = cx - 10 + s;
    const len = 18 + Math.round(Math.sin(s * 0.7) * 3 + r() * 4);
    let x = sx;
    for (let y = 0; y < len; y++) {
      const by = 28 + y;
      if (by > 50) break;
      x = sx + Math.round(Math.sin((y + sway * 3) * 0.25) * (y / 10) * (1 + Math.abs(sway) * 0.5)) + Math.round((sway * y) / 12);
      px(ctx, x, by, s % 4 === 0 ? pal.x : pal.z);
    }
    px(ctx, x, 28 + Math.min(len, 22), OUT);
  }
  // Bart-Peitsche: Strähne weit ausgestreckt
  if (frame === 3) {
    for (let i = 0; i < 26; i++) {
      const y = 34 + Math.round(Math.sin(i * 0.4) * 2);
      px(ctx, cx + 10 + i, y, pal.z, 1, 3);
      px(ctx, cx + 10 + i, y + 3, pal.x);
    }
  }
}

function bossSheets(scene: Phaser.Scene): void {
  for (let v = 0; v < 4; v++) {
    const [c, ctx] = makeCanvas(BOSS_W * 6, BOSS_H);
    for (let f = 0; f < 6; f++) drawBoss(ctx, f * BOSS_W, f, v);
    registerSheet(scene, `boss${v}`, c, BOSS_W, BOSS_H);
  }
}

// ============================================================
// ITEMS & PFANDFLASCHEN
// ============================================================

function drawBottle(ctx: CanvasRenderingContext2D, ox: number, type: number): void {
  const cols = [
    { body: '#2f9e44', dark: '#1d6a2c', hi: '#8ee89a', cap: '#d8c040' },
    { body: '#8a4a1a', dark: '#5a2c0c', hi: '#d8955a', cap: '#c0c0c0' },
    { body: '#9ad8f0', dark: '#5aa0c8', hi: '#ffffff', cap: '#2860d0' },
  ][type];
  const plastic = type === 2;
  const bx = ox + (plastic ? 4 : 5);
  const bw = plastic ? 8 : 6;
  // Umriss
  px(ctx, ox + 6, 0, OUT, 4, 5);
  px(ctx, bx - 1, 4, OUT, bw + 2, 12);
  // Deckel + Hals
  px(ctx, ox + 7, 1, cols.cap, 2, 1);
  px(ctx, ox + 7, 2, cols.body, 2, 3);
  // Körper
  px(ctx, bx, 5, cols.body, bw, 10);
  px(ctx, bx + bw - 2, 5, cols.dark, 2, 10);
  px(ctx, bx + 1, 6, cols.hi, 1, 7);
  if (plastic) {
    for (let y = 7; y < 15; y += 3) px(ctx, bx, y, cols.dark, bw, 1);
  }
  // Etikett mit eigenem Pfand-Symbol (Flasche + Pfeil-Kreis)
  px(ctx, bx, 9, '#f4f0e0', bw, 4);
  px(ctx, ox + 7, 10, '#2a9a48', 2, 2);
  px(ctx, ox + 6, 10, '#2a9a48', 1, 1);
  px(ctx, ox + 9, 11, '#2a9a48', 1, 1);
}

function drawTaco(ctx: CanvasRenderingContext2D, ox: number): void {
  // Füllung
  ellipse(ctx, ox + 8, 8, 6, 3, '#3aa83a');
  px(ctx, ox + 4, 6, '#e03020', 2, 2);
  px(ctx, ox + 9, 5, '#e03020', 2, 2);
  px(ctx, ox + 6, 7, '#7a4020', 3, 2);
  px(ctx, ox + 11, 7, '#f8f0a0', 2, 1);
  // Schale (Halbmond)
  for (let y = 0; y < 7; y++) {
    const hw = Math.round(7 * Math.sqrt(1 - (y * y) / 49));
    px(ctx, ox + 8 - hw - 1, 8 + y, OUT, 1, 1);
    px(ctx, ox + 8 + hw, 8 + y, OUT, 1, 1);
    px(ctx, ox + 8 - hw, 8 + y, y > 4 ? '#c88a28' : '#f0c048', hw * 2, 1);
  }
  px(ctx, ox + 4, 15, OUT, 8, 1);
  px(ctx, ox + 3, 10, '#c88a28', 1, 1);
  px(ctx, ox + 7, 11, '#c88a28', 1, 1);
  px(ctx, ox + 11, 12, '#c88a28', 1, 1);
}

function itemSheets(scene: Phaser.Scene): void {
  {
    const [c, ctx] = makeCanvas(48, 16);
    for (let i = 0; i < 3; i++) drawBottle(ctx, i * 16, i);
    registerSheet(scene, 'bottle', c, 16, 16);
  }
  {
    // 0 Taco, 1 Chili, 2 Goldener Kaktus, 3 Lucha-Maske
    const [c, ctx] = makeCanvas(64, 16);
    drawTaco(ctx, 0);
    drawRows(ctx, D.CHILI, { k: OUT, R: '#e02820', r: '#ff9080', g: '#2a8a3a', G: '#58c858' }, 16, 0);
    drawRows(ctx, D.GOLD_CACTUS, { k: OUT, Y: '#f8c820', o: '#fff8b0', y: '#a87810' }, 32, 0);
    drawRows(ctx, D.LUCHA_MASK, { k: OUT, R: '#2a6ae0', Y: '#f8d040', w: '#ffffff' }, 48, 0);
    registerSheet(scene, 'items', c, 16, 16);
  }
  {
    // Bananenschale: 0/1 fliegend, 2 liegend
    const [c, ctx] = makeCanvas(36, 8);
    const bp = { k: OUT, Y: '#f8e040', y: '#c0a020' };
    drawRows(ctx, D.BANANA_PEEL, bp, 0, 0);
    drawRows(ctx, D.BANANA_PEEL, bp, 12, 0, true);
    drawRows(ctx, D.BANANA_PEEL_LYING, bp, 24, 0);
    registerSheet(scene, 'banana', c, 12, 8);
  }
  {
    // Chili-Feuerball 8x8, 2 Frames
    const [c, ctx] = makeCanvas(16, 8);
    for (let f = 0; f < 2; f++) {
      const o = f * 8;
      ellipse(ctx, o + 4, 4, 3, 3, '#e83010');
      ellipse(ctx, o + 4 + (f ? -1 : 1), 4, 2, 2, '#f8a020');
      px(ctx, o + 3 + f, 3, '#fff8a0', 2, 2);
    }
    registerSheet(scene, 'fireball', c, 8, 8);
  }
  {
    // Boss-Projektile: 0 Feuer (12x12), 1 Riesenbanane, 2/3 Schockwelle
    const [c, ctx] = makeCanvas(64, 16);
    ellipse(ctx, 8, 8, 6, 6, '#e83010');
    ellipse(ctx, 8, 8, 4, 4, '#f8a020');
    ellipse(ctx, 8, 8, 2, 2, '#fff8a0');
    // Riesenbanane
    for (let i = 0; i < 12; i++) {
      const y = 10 - Math.round(Math.sin((i / 11) * Math.PI) * 6);
      px(ctx, 18 + i, y - 1, OUT, 1, 5);
      px(ctx, 18 + i, y, '#f8e040', 1, 3);
    }
    px(ctx, 17, 9, '#6a4a10', 2, 2);
    // Schockwelle
    for (let f = 0; f < 2; f++) {
      const o = 32 + f * 16;
      for (let x = 0; x < 16; x++) {
        const h = Math.round(4 + Math.sin((x / 15) * Math.PI) * (f ? 9 : 7));
        px(ctx, o + x, 16 - h, f ? '#f8d070' : '#ffffff', 1, h);
        px(ctx, o + x, 16 - h, '#f8a040', 1, 1);
      }
    }
    registerSheet(scene, 'bossfx', c, 16, 16);
  }
}

// ============================================================
// LEVEL-OBJEKTE: Checkpoint, Ziel-Kaktus, Cantina, Plattformen
// ============================================================

function levelObjects(scene: Phaser.Scene): void {
  // Agave-Fahne: 0 inaktiv, 1 aktiv, 2 aktiv (wehend)
  {
    const [c, ctx] = makeCanvas(48, 32);
    for (let f = 0; f < 3; f++) {
      const o = f * 16;
      px(ctx, o + 7, 2, OUT, 2, 28);
      px(ctx, o + 7, 3, '#c0b090', 1, 27);
      const flagPal = f === 0
        ? { k: OUT, o: '#f0e0a0', F: '#8a8a8a', a: '#5a5a5a' }
        : { k: OUT, o: '#f0e0a0', F: '#3ab04a', a: '#f8f0c0' };
      const rows = f === 2 ? D.AGAVE_FLAG.map((r, i) => (i > 2 && i < 8 ? r.slice(0, 15) + '.' : r)) : D.AGAVE_FLAG;
      drawRows(ctx, rows, flagPal, o, f === 2 ? 1 : 0);
      // Agave-Pflanze am Fuß
      for (let i = -3; i <= 3; i++) line(ctx, o + 8, 31, o + 8 + i * 2, 25 + Math.abs(i), '#3a8a5a');
      px(ctx, o + 2, 31, '#2a6a4a', 12, 1);
    }
    registerSheet(scene, 'checkpoint', c, 16, 32);
  }
  // Ziel: riesiger Saguaro-Kaktus 32x160
  {
    const [c, ctx] = makeCanvas(32, 160);
    const green = '#3a9a4a';
    const dark = '#226a34';
    const light = '#7ad07a';
    // Stamm
    px(ctx, 9, 8, OUT, 14, 152);
    px(ctx, 10, 9, green, 12, 151);
    px(ctx, 18, 9, dark, 4, 151);
    px(ctx, 12, 9, light, 1, 151);
    ellipse(ctx, 16, 9, 6, 4, OUT);
    ellipse(ctx, 16, 9, 5, 3, green);
    // Arme
    // Arme: waagrechter Stummel + senkrechter Ast mit runder Spitze
    const arm = (side: number, y: number, h: number) => {
      const ax = side > 0 ? 24 : 2; // Ast-Spalte (6 breit)
      const sx = side > 0 ? 21 : 7; // Stummel beginnt am Stamm
      px(ctx, Math.min(sx, ax), y - 1, OUT, Math.abs(ax - sx) + 7, 8);
      px(ctx, ax - 1, y - h - 1, OUT, 8, h + 2);
      ellipse(ctx, ax + 2.5, y - h, 4, 3, OUT);
      px(ctx, Math.min(sx, ax) + 1, y, green, Math.abs(ax - sx) + 5, 6);
      px(ctx, ax, y - h, green, 6, h + 6);
      ellipse(ctx, ax + 2.5, y - h, 3, 2, green);
      px(ctx, ax + 1, y - h, light, 1, h + 4);
    };
    arm(1, 72, 22);
    arm(-1, 104, 18);
    // Stacheln
    for (let y = 12; y < 158; y += 6) {
      px(ctx, 8, y, '#f8f0c0');
      px(ctx, 23, y + 3, '#f8f0c0');
    }
    // Rillen
    for (let y = 14; y < 158; y += 4) px(ctx, 15, y, dark);
    registerCanvas(scene, 'goal-cactus', c);
  }
  // Zielfahne (Sombrero-Emblem) 16x12
  {
    const [c, ctx] = makeCanvas(16, 12);
    px(ctx, 0, 0, OUT, 16, 12);
    px(ctx, 1, 1, '#2a9a48', 5, 10);
    px(ctx, 6, 1, '#f8f4e8', 4, 10);
    px(ctx, 10, 1, '#d8283c', 5, 10);
    px(ctx, 6, 6, '#f0c048', 4, 2);
    px(ctx, 7, 4, '#f0c048', 2, 2);
    registerCanvas(scene, 'goal-flag', c);
  }
  // Cantina 64x48
  {
    const [c, ctx] = makeCanvas(64, 48);
    px(ctx, 2, 14, OUT, 60, 34);
    px(ctx, 3, 15, '#e8c890', 58, 33);
    px(ctx, 3, 40, '#c8a070', 58, 8);
    px(ctx, 0, 8, OUT, 64, 8);
    px(ctx, 1, 9, '#c84a2a', 62, 6);
    for (let x = 2; x < 62; x += 6) px(ctx, x, 9, '#e8704a', 3, 6);
    // Tür
    px(ctx, 25, 26, OUT, 14, 22);
    px(ctx, 26, 27, '#3a2010', 12, 21);
    px(ctx, 26, 30, '#8a5020', 5, 8);
    px(ctx, 33, 30, '#8a5020', 5, 8);
    // Fenster
    for (const wx of [8, 46]) {
      px(ctx, wx, 22, OUT, 10, 10);
      px(ctx, wx + 1, 23, '#f8d870', 8, 8);
      px(ctx, wx + 4, 23, OUT, 1, 8);
    }
    // Schild
    px(ctx, 14, 0, OUT, 36, 9);
    px(ctx, 15, 1, '#2a9a48', 34, 7);
    registerCanvas(scene, 'cantina', c);
  }
  // Plattformen: bewegliche Brett-Plattform 48x8 (je Welt), Fallplattform 32x8, Lore 32x16
  {
    const woods = [['#b8784a', '#6a3a1a'], ['#3ab8b0', '#1a6a68'], ['#9a6a38', '#523218'], ['#7a9a68', '#3a5a30']];
    const [c, ctx] = makeCanvas(48, 32);
    woods.forEach(([w, d], i) => {
      const y = i * 8;
      px(ctx, 0, y, OUT, 48, 8);
      px(ctx, 1, y + 1, w, 46, 5);
      px(ctx, 1, y + 5, d, 46, 2);
      for (let x = 8; x < 48; x += 12) px(ctx, x, y + 1, d, 1, 5);
      px(ctx, 3, y + 2, '#e8d8b0', 1, 1);
      px(ctx, 44, y + 2, '#e8d8b0', 1, 1);
    });
    registerSheet(scene, 'platform', c, 48, 8);
  }
  {
    const [c, ctx] = makeCanvas(32, 16);
    px(ctx, 0, 0, OUT, 32, 8);
    px(ctx, 1, 1, '#d06a3a', 30, 5);
    px(ctx, 1, 5, '#8a3a1a', 30, 2);
    line(ctx, 6, 1, 10, 5, '#8a3a1a');
    line(ctx, 20, 1, 17, 6, '#8a3a1a');
    // Frame 2: wackelnd/heller
    px(ctx, 0, 8, OUT, 32, 8);
    px(ctx, 1, 9, '#e8905a', 30, 5);
    px(ctx, 1, 13, '#a04a2a', 30, 2);
    registerSheet(scene, 'fallplat', c, 32, 8);
  }
  {
    const [c, ctx] = makeCanvas(32, 16);
    px(ctx, 0, 0, OUT, 32, 12);
    px(ctx, 1, 1, '#7a7a8a', 30, 10);
    px(ctx, 1, 1, '#a8a8b8', 30, 2);
    px(ctx, 3, 4, '#5a5a6a', 26, 1);
    px(ctx, 3, 8, '#5a5a6a', 26, 1);
    for (const wx of [7, 25]) {
      ellipseOutlined(ctx, wx, 13, 2, 2, '#3a3a40', OUT);
    }
    // Silbererz in der Lore
    px(ctx, 6, 0, '#d8e0f0', 4, 1);
    px(ctx, 14, 0, '#f0f4ff', 3, 1);
    registerCanvas(scene, 'minecart', c);
  }
}

// ============================================================
// EFFEKTE
// ============================================================

function effects(scene: Phaser.Scene): void {
  {
    const [c, ctx] = makeCanvas(1, 1);
    px(ctx, 0, 0, '#ffffff');
    registerCanvas(scene, 'px', c);
  }
  {
    // Staub: 3 Frames 8x8
    const [c, ctx] = makeCanvas(24, 8);
    [3, 2, 1].forEach((r, i) => {
      ellipse(ctx, i * 8 + 4, 4, r, r, '#f0e8d8');
      if (r > 1) px(ctx, i * 8 + 3, 3, '#ffffff', 1, 1);
    });
    registerSheet(scene, 'dust', c, 8, 8);
  }
  {
    const [c, ctx] = makeCanvas(3, 3);
    px(ctx, 0, 0, '#ffffff', 3, 3);
    registerCanvas(scene, 'chip', c);
  }
  {
    // Funkeln 7x7
    const [c, ctx] = makeCanvas(7, 7);
    px(ctx, 3, 0, '#ffffff', 1, 7);
    px(ctx, 0, 3, '#ffffff', 7, 1);
    px(ctx, 2, 2, '#ffffff', 3, 3);
    registerCanvas(scene, 'spark', c);
  }
  {
    // Ziegelbrocken 6x6
    const [c, ctx] = makeCanvas(6, 6);
    px(ctx, 0, 0, OUT, 6, 6);
    px(ctx, 1, 1, '#d8784a', 4, 4);
    px(ctx, 1, 1, '#f0a070', 2, 1);
    registerCanvas(scene, 'brickchip', c);
  }
  {
    // Weiches Licht (Mine) 128x128
    const [c, ctx] = makeCanvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,220,140,0.55)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    registerCanvas(scene, 'glow', c);
  }
  {
    // Dunkelheit mit Loch (Mine): 768x432, Loch in der Mitte
    const [c, ctx] = makeCanvas(768, 432);
    ctx.fillStyle = 'rgba(4,2,10,0.86)';
    ctx.fillRect(0, 0, 768, 432);
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(384, 216, 30, 384, 216, 130);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.7)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 768, 432);
    registerCanvas(scene, 'darkness', c);
  }
}

export function createSprites(scene: Phaser.Scene): void {
  jamalSheet(scene, 'jamal-s', JAMAL_PAL, false);
  jamalSheet(scene, 'jamal-b', JAMAL_PAL, true);
  jamalSheet(scene, 'jamal-f', JAMAL_FIRE, true);
  zyrooSheets(scene);
  bossSheets(scene);
  itemSheets(scene);
  levelObjects(scene);
  effects(scene);
}
