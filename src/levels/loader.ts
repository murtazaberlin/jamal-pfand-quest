import { Solid, TileGrid } from '../physics/collision';
import { BlockContent, EntitySpawn, LevelDef, TK } from './types';

const TILE_CHARS: Record<string, TK> = {
  X: TK.Ground,
  H: TK.Hard,
  '#': TK.Brick,
  $: TK.Brick,
  '?': TK.Pinata,
  '*': TK.Pinata,
  K: TK.Pinata,
  M: TK.Pinata,
  i: TK.Hidden,
  '=': TK.OneWay,
  '[': TK.WellTL,
  ']': TK.WellTR,
  '{': TK.WellBL,
  '}': TK.WellBR,
  '^': TK.Spikes,
  L: TK.Lava,
  w: TK.BackWall,
  r: TK.Rail,
  '|': TK.Pillar,
};

const CONTENT: Record<string, BlockContent> = {
  '?': 'bottle', '*': 'power', K: 'star', M: 'mask', i: 'mask', $: 'multi',
};

const ENTITY_CHARS = new Set(['B', '@', 'C', 'G', 'g', 'p', 'f', 't', 's', '-', 'v', '~', 'c', 'Q']);

export function solidOf(k: TK): Solid {
  switch (k) {
    case TK.Ground: case TK.Hard: case TK.Brick: case TK.Pinata: case TK.Used:
    case TK.WellTL: case TK.WellTR: case TK.WellBL: case TK.WellBR: case TK.Spikes:
      return Solid.Full;
    case TK.OneWay:
      return Solid.OneWay;
    default:
      return Solid.None;
  }
}

/** Veränderbares Kachelraster eines Levels. */
export class LevelGrid implements TileGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: Uint8Array;
  readonly content = new Map<number, BlockContent>();
  /** Restliche Flaschen in Mehrfach-Ziegeln */
  readonly multiLeft = new Map<number, number>();

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = new Uint8Array(cols * rows);
  }

  idx(tx: number, ty: number): number {
    return ty * this.cols + tx;
  }

  get(tx: number, ty: number): TK {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return TK.Empty;
    return this.tiles[ty * this.cols + tx] as TK;
  }

  set(tx: number, ty: number, k: TK): void {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return;
    this.tiles[ty * this.cols + tx] = k;
  }

  solidAt(tx: number, ty: number): Solid {
    return solidOf(this.get(tx, ty));
  }
}

export interface ParsedLevel {
  grid: LevelGrid;
  entities: EntitySpawn[];
  start: { tx: number; ty: number };
  checkpoint: { tx: number; ty: number } | null;
  goal: { tx: number; ty: number } | null;
  boss: { tx: number; ty: number } | null;
}

export function parseRows(rows: string[]): ParsedLevel {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const grid = new LevelGrid(w, h);
  const entities: EntitySpawn[] = [];
  let start = { tx: 2, ty: h - 3 };
  let checkpoint: ParsedLevel['checkpoint'] = null;
  let goal: ParsedLevel['goal'] = null;
  let boss: ParsedLevel['boss'] = null;
  for (let ty = 0; ty < h; ty++) {
    const row = rows[ty];
    for (let tx = 0; tx < w; tx++) {
      const ch = row[tx] ?? '.';
      const tk = TILE_CHARS[ch];
      if (tk !== undefined) {
        grid.set(tx, ty, tk);
        const c = CONTENT[ch];
        if (c) {
          grid.content.set(grid.idx(tx, ty), c);
          if (c === 'multi') grid.multiLeft.set(grid.idx(tx, ty), 8);
        }
        continue;
      }
      if (!ENTITY_CHARS.has(ch)) continue;
      if (ch === '@') start = { tx, ty };
      else if (ch === 'C') checkpoint = { tx, ty };
      else if (ch === 'G') goal = { tx, ty };
      else if (ch === 'Q') boss = { tx, ty };
      else {
        const next = row[tx + 1];
        const range = next && /[1-9]/.test(next) ? parseInt(next, 10) : 3;
        entities.push({ type: ch, tx, ty, range });
      }
    }
  }
  return { grid, entities, start, checkpoint, goal, boss };
}

export function parseLevel(def: LevelDef): ParsedLevel {
  return parseRows(def.rows);
}
