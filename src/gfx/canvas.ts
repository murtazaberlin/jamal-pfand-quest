import Phaser from 'phaser';

export type Palette = Record<string, string>;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D nicht verfügbar');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Zeichnet ein Sprite aus Zeichen-Zeilen. '.' und ' ' sind transparent. */
export function drawRows(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  pal: Palette,
  ox: number,
  oy: number,
  flipX = false,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      const px = flipX ? row.length - 1 - x : x;
      ctx.fillRect(ox + px, oy + y, 1, 1);
    }
  }
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Gefüllte Ellipse, pixelgenau. */
export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry + 0.0001);
    if (t < 0) continue;
    const hw = Math.round(rx * Math.sqrt(t));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
  }
}

/** Ellipse mit 1-px-Umriss. */
export function ellipseOutlined(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, fill: string, outline: string,
): void {
  ellipse(ctx, cx, cy, rx + 1, ry + 1, outline);
  ellipse(ctx, cx, cy, rx, ry, fill);
}

export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, w = 1): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), w, w);
  }
}

/** Fügt einer Canvas-Textur nummerierte Frames in einem Raster hinzu. */
export function registerSheet(
  scene: Phaser.Scene,
  key: string,
  canvas: HTMLCanvasElement,
  frameW: number,
  frameH: number,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, canvas);
  if (!tex) return;
  const cols = Math.floor(canvas.width / frameW);
  const rows = Math.floor(canvas.height / frameH);
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      tex.add(i, 0, x * frameW, y * frameH, frameW, frameH);
      i++;
    }
  }
}

export function registerCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/** Ersetzt Farben einer Palette (für Paletten-Tausch). */
export function swapPalette(base: Palette, swaps: Palette): Palette {
  return { ...base, ...swaps };
}

/** Einfache deterministische Zufallszahlen (Mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f >= 0) {
    r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f;
  } else {
    r *= 1 + f; g *= 1 + f; b *= 1 + f;
  }
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
