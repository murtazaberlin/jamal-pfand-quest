import { TILE } from '../config';

/** Kollisionsart einer Kachel. */
export const enum Solid {
  None = 0,
  Full = 1,
  OneWay = 2,
}

export interface TileGrid {
  readonly cols: number;
  readonly rows: number;
  solidAt(tx: number, ty: number): Solid;
}

export interface Body {
  x: number; // linke Kante
  y: number; // obere Kante
  w: number;
  h: number;
  vx: number;
  vy: number;
}

/** Bewegliche Plattform (oben begehbar, wie Einweg). */
export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  dx: number; // Bewegung im letzten Schritt
  dy: number;
  solidSides?: boolean;
  onStand?(): void;
}

export interface Contacts {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Kacheln, an die mit dem Kopf gestoßen wurde (für Blöcke). */
  headTiles: Array<{ tx: number; ty: number }>;
  platform: Platform | null;
}

export interface MoveOptions {
  /** Durch Einweg-Plattformen fallen (Ducken + Springen). */
  dropThrough?: boolean;
  /** Ecken-Korrektur beim Kopfstoß in Pixeln. */
  cornerCorrection?: number;
  /** Seitliche Grenzen des Levels. */
  minX?: number;
  maxX?: number;
  platforms?: readonly Platform[];
}

const EPS = 0.001;

export function emptyContacts(): Contacts {
  return { left: false, right: false, up: false, down: false, headTiles: [], platform: null };
}

function isFull(grid: TileGrid, tx: number, ty: number): boolean {
  if (tx < 0 || tx >= grid.cols) return true; // Levelränder sind Wände
  if (ty < 0 || ty >= grid.rows) return false; // oben offen, unten Abgrund
  return grid.solidAt(tx, ty) === Solid.Full;
}

/** Prüft, ob ein Rechteck mit einer Vollkachel überlappt. */
export function overlapsSolid(grid: TileGrid, x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + w - EPS) / TILE);
  const y0 = Math.floor(y / TILE);
  const y1 = Math.floor((y + h - EPS) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isFull(grid, tx, ty)) return true;
    }
  }
  return false;
}

/**
 * Bewegt einen Körper achsenweise (erst X, dann Y) und löst Kollisionen auf.
 * Achsenweise Auflösung verhindert Hängenbleiben an Kachelfugen.
 */
export function moveBody(body: Body, dt: number, grid: TileGrid, opts: MoveOptions = {}): Contacts {
  const c = emptyContacts();
  const corner = opts.cornerCorrection ?? 0;

  // ---------- X ----------
  let nx = body.x + body.vx * dt;
  if (body.vx > 0) {
    const right = nx + body.w;
    const tx = Math.floor((right - EPS) / TILE);
    const y0 = Math.floor(body.y / TILE);
    const y1 = Math.floor((body.y + body.h - EPS) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (isFull(grid, tx, ty)) {
        nx = tx * TILE - body.w;
        body.vx = 0;
        c.right = true;
        break;
      }
    }
  } else if (body.vx < 0) {
    const tx = Math.floor(nx / TILE);
    const y0 = Math.floor(body.y / TILE);
    const y1 = Math.floor((body.y + body.h - EPS) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (isFull(grid, tx, ty)) {
        nx = (tx + 1) * TILE;
        body.vx = 0;
        c.left = true;
        break;
      }
    }
  }
  if (opts.minX !== undefined && nx < opts.minX) {
    nx = opts.minX;
    if (body.vx < 0) body.vx = 0;
    c.left = true;
  }
  if (opts.maxX !== undefined && nx + body.w > opts.maxX) {
    nx = opts.maxX - body.w;
    if (body.vx > 0) body.vx = 0;
    c.right = true;
  }
  body.x = nx;

  // Feste Seiten von Plattformen (z. B. Loren) – einfache Auflösung
  if (opts.platforms) {
    for (const p of opts.platforms) {
      if (!p.solidSides) continue;
      if (rectOverlap(body.x, body.y + 2, body.w, body.h - 4, p.x, p.y, p.w, p.h)) {
        const bodyCx = body.x + body.w / 2;
        if (bodyCx < p.x + p.w / 2) { body.x = p.x - body.w; c.right = true; }
        else { body.x = p.x + p.w; c.left = true; }
        body.vx = 0;
      }
    }
  }

  // ---------- Y ----------
  const prevBottom = body.y + body.h;
  let ny = body.y + body.vy * dt;
  if (body.vy > 0) {
    const bottom = ny + body.h;
    const ty = Math.floor((bottom - EPS) / TILE);
    const x0 = Math.floor(body.x / TILE);
    const x1 = Math.floor((body.x + body.w - EPS) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      let land = isFull(grid, tx, ty);
      if (!land && !opts.dropThrough && ty >= 0 && ty < grid.rows && tx >= 0 && tx < grid.cols) {
        if (grid.solidAt(tx, ty) === Solid.OneWay && prevBottom <= ty * TILE + EPS) land = true;
      }
      if (land) {
        ny = ty * TILE - body.h;
        body.vy = 0;
        c.down = true;
        break;
      }
    }
    // Bewegliche Plattformen
    if (opts.platforms && !opts.dropThrough) {
      for (const p of opts.platforms) {
        const top = p.y;
        if (body.x + body.w > p.x + EPS && body.x < p.x + p.w - EPS) {
          // vorheriger Fuß über Plattformoberkante (Plattformbewegung berücksichtigen)
          if (prevBottom <= top - p.dy + 2 && ny + body.h >= top - EPS) {
            if (!c.down || top - body.h < ny) {
              ny = top - body.h;
              body.vy = 0;
              c.down = true;
              c.platform = p;
            }
          }
        }
      }
    }
  } else if (body.vy < 0) {
    const ty = Math.floor(ny / TILE);
    const x0 = Math.floor(body.x / TILE);
    const x1 = Math.floor((body.x + body.w - EPS) / TILE);
    const hits: number[] = [];
    for (let tx = x0; tx <= x1; tx++) if (isFull(grid, tx, ty)) hits.push(tx);
    if (hits.length > 0) {
      // Ecken-Korrektur: nur knapp an einer Ecke hängen → seitlich vorbeischieben
      let corrected = false;
      if (corner > 0 && ty >= 0) {
        for (let s = 1; s <= corner && !corrected; s++) {
          for (const dir of [-1, 1]) {
            const tryX = body.x + dir * s;
            if (!overlapsSolid(grid, tryX, ny, body.w, body.h) && !overlapsSolid(grid, tryX, body.y, body.w, body.h)) {
              body.x = tryX;
              corrected = true;
              break;
            }
          }
        }
      }
      if (!corrected) {
        ny = (ty + 1) * TILE;
        body.vy = 0;
        c.up = true;
        for (const tx of hits) c.headTiles.push({ tx, ty });
      }
    }
  }
  body.y = ny;
  return c;
}

export function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** Steht der Körper auf festem Boden (ohne Bewegung)? */
export function isGrounded(body: Body, grid: TileGrid, platforms?: readonly Platform[]): boolean {
  const ty = Math.floor((body.y + body.h + 0.5) / TILE);
  const x0 = Math.floor(body.x / TILE);
  const x1 = Math.floor((body.x + body.w - EPS) / TILE);
  const atTop = Math.abs(body.y + body.h - ty * TILE) < 0.6;
  if (atTop) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isFull(grid, tx, ty)) return true;
      if (tx >= 0 && tx < grid.cols && ty >= 0 && ty < grid.rows && grid.solidAt(tx, ty) === Solid.OneWay) return true;
    }
  }
  if (platforms) {
    for (const p of platforms) {
      if (Math.abs(body.y + body.h - p.y) < 0.6 && body.x + body.w > p.x && body.x < p.x + p.w) return true;
    }
  }
  return false;
}
