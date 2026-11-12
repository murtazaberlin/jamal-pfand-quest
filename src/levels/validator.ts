import { TILE, FIXED_DT } from '../config';
import { Solid, TileGrid, rectOverlap } from '../physics/collision';
import { NO_INPUT, PHYS, PlayerInput, createPlayerPhys, setBig, stepPlayer } from '../physics/player';
import { LevelGrid, ParsedLevel, parseRows } from './loader';
import { TK } from './types';

/**
 * Level-Validator: simuliert mit der ECHTEN Spielerphysik alle relevanten
 * Sprung-/Laufvarianten von jeder erreichbaren Standposition aus (BFS) und
 * prüft, ob Ziel (bzw. Boss-Arena / Bonus-Ausgang) erreichbar ist.
 * Bewegliche Plattformen werden entlang ihres Weges als Einweg-Flächen
 * abgetastet, Fallplattformen als Einweg-Flächen behandelt.
 */

interface Node { tx: number; ty: number } // ty = Reihe, in der die Füße stehen (Fußhöhe = ty+1 Oberkante)

export interface ValidationResult {
  ok: boolean;
  reachedGoal: boolean;
  reachedCheckpoint: boolean;
  nodes: number;
  maxX: number;
  message: string;
}

class OverlayGrid implements TileGrid {
  readonly cols: number;
  readonly rows: number;
  private extra = new Set<number>();
  constructor(private base: LevelGrid) {
    this.cols = base.cols;
    this.rows = base.rows;
  }
  addOneWay(tx: number, ty: number): void {
    if (tx >= 0 && tx < this.cols && ty >= 0 && ty < this.rows) this.extra.add(ty * this.cols + tx);
  }
  solidAt(tx: number, ty: number): Solid {
    const s = this.base.solidAt(tx, ty);
    if (s !== Solid.None) return s;
    return this.extra.has(ty * this.cols + tx) ? Solid.OneWay : Solid.None;
  }
}

function buildGrid(p: ParsedLevel): OverlayGrid {
  const g = new OverlayGrid(p.grid);
  for (const e of p.entities) {
    if (e.type === '-' || e.type === 'c') {
      const w = e.type === 'c' ? 2 : 3;
      for (let d = -e.range; d <= e.range; d++) for (let i = 0; i < w; i++) g.addOneWay(e.tx + d + i, e.ty);
    } else if (e.type === 'v') {
      for (let d = -e.range; d <= e.range; d++) for (let i = 0; i < 3; i++) g.addOneWay(e.tx + i, e.ty + d);
    } else if (e.type === '~') {
      g.addOneWay(e.tx, e.ty);
      g.addOneWay(e.tx + 1, e.ty);
    }
  }
  return g;
}

function hazardAt(grid: LevelGrid, x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h + 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const k = grid.get(tx, ty);
      if (k === TK.Lava) return true;
      if (k === TK.Spikes) return true;
    }
  }
  return false;
}

function isStandable(grid: TileGrid, tx: number, ty: number, big: boolean): boolean {
  const need = big ? 2 : 1;
  for (let i = 0; i < need; i++) if (grid.solidAt(tx, ty - i) === Solid.Full) return false;
  const below = grid.solidAt(tx, ty + 1);
  return below !== Solid.None;
}

export interface ValidateOptions {
  big?: boolean;
  /** Zielbereich: Spalte, ab der als "geschafft" gilt (Standard: Ziel-Kaktus bzw. Boss) */
  targetCol?: number;
  targetRow?: number;
  /** Bonusraum: Ziel = Brunnen-Ausgang */
  targetWell?: boolean;
}

export function validateRows(rows: string[], opts: ValidateOptions = {}): ValidationResult {
  const parsed = parseRows(rows);
  return validateParsed(parsed, opts);
}

export function validateParsed(parsed: ParsedLevel, opts: ValidateOptions = {}): ValidationResult {
  const big = !!opts.big;
  const grid = buildGrid(parsed);
  const base = parsed.grid;
  const levelW = base.cols * TILE;
  const levelH = base.rows * TILE;

  // Zielkriterium
  let targetCol = opts.targetCol ?? parsed.goal?.tx ?? parsed.boss?.tx ?? base.cols - 2;
  const wellCols: number[] = [];
  if (opts.targetWell) {
    for (let ty = 0; ty < base.rows; ty++) for (let tx = 0; tx < base.cols; tx++) {
      if (base.get(tx, ty) === TK.WellTL) wellCols.push(tx);
    }
    targetCol = wellCols[0] ?? targetCol;
  }
  const isTarget = (n: Node): boolean => {
    if (opts.targetWell) {
      return (base.get(n.tx, n.ty + 1) === TK.WellTL || base.get(n.tx, n.ty + 1) === TK.WellTR);
    }
    if (parsed.boss && !parsed.goal) return Math.abs(n.tx - targetCol) <= 6;
    return n.tx >= targetCol - 1;
  };

  const key = (n: Node) => n.ty * 10000 + n.tx;
  const seen = new Set<number>();
  const queue: Node[] = [];
  let reachedGoal = false;
  let reachedCheckpoint = !parsed.checkpoint;
  let maxX = 0;

  // Startknoten: fallen lassen
  const startX = parsed.start.tx * TILE + 8;
  const sp = createPlayerPhys(startX, (parsed.start.ty + 1) * TILE, false);
  if (big) setBig(sp, true, grid);
  for (let i = 0; i < 240 && !sp.onGround; i++) stepPlayer(sp, NO_INPUT, FIXED_DT, grid, { minX: 0, maxX: levelW });
  if (!sp.onGround) return { ok: false, reachedGoal: false, reachedCheckpoint: false, nodes: 0, maxX: 0, message: 'Start schwebt' };
  const startNode = { tx: Math.floor((sp.body.x + sp.body.w / 2) / TILE), ty: Math.round((sp.body.y + sp.body.h) / TILE) - 1 };
  queue.push(startNode);
  seen.add(key(startNode));

  const touchesGoalPole = (x: number, y: number, w: number, h: number): boolean => {
    if (!parsed.goal) return false;
    const gx = parsed.goal.tx * TILE;
    return rectOverlap(x, y, w, h, gx + 4, 0, 8, levelH);
  };

  const holds = [0, 3, 8, 16, 40];
  const done = () => reachedGoal && reachedCheckpoint;
  while (queue.length > 0 && !done()) {
    const n = queue.shift()!;
    if (isTarget(n)) { reachedGoal = true; continue; }
    if (parsed.checkpoint && Math.abs(n.tx - parsed.checkpoint.tx) <= 1) reachedCheckpoint = true;
    maxX = Math.max(maxX, n.tx);
    for (const dir of [-1, 1, 0]) {
      const behind1 = isStandable(grid, n.tx - dir, n.ty, big);
      const behind2 = behind1 && isStandable(grid, n.tx - 2 * dir, n.ty, big);
      const speeds: Array<[number, boolean]> = [[0, false]];
      if (dir !== 0) {
        speeds.push([0, true]);
        if (behind1) speeds.push([PHYS.WALK_MAX, false]);
        if (behind2) speeds.push([PHYS.RUN_MAX, true]);
      }
      for (const [v0, run] of speeds) {
        for (const hold of holds) {
          if (dir === 0 && hold === 0) continue;
          for (const steerFrames of hold >= 16 && dir !== 0 ? [999, 12, 6] : [999]) {
            const p = createPlayerPhys(n.tx * TILE + 8, (n.ty + 1) * TILE, false);
            if (big) setBig(p, true, grid);
            p.onGround = true;
            p.body.vx = dir * v0;
            p.facing = dir >= 0 ? 1 : -1;
            let left = false;
            let fail = false;
            for (let f = 0; f < 200; f++) {
              const steer = f < steerFrames;
              const inp: PlayerInput = {
                ...NO_INPUT,
                left: steer && dir < 0,
                right: steer && dir > 0,
                run,
                jumpPressed: hold > 0 && f === 0,
                jumpHeld: hold > 0 && f < hold,
              };
              stepPlayer(p, inp, FIXED_DT, grid, { minX: 0, maxX: levelW });
              const b = p.body;
              if (touchesGoalPole(b.x, b.y, b.w, b.h)) { reachedGoal = true; break; }
              if (parsed.checkpoint && Math.abs(b.x + b.w / 2 - (parsed.checkpoint.tx * TILE + 8)) < 10) reachedCheckpoint = true;
              if (b.y > levelH + 8 || hazardAt(base, b.x, b.y, b.w, b.h)) { fail = true; break; }
              if (!p.onGround) left = true;
              const cx = b.x + b.w / 2;
              const cTx = Math.floor(cx / TILE);
              if (p.onGround && (left || (hold === 0 && cTx !== n.tx))) {
                const node = { tx: cTx, ty: Math.round((b.y + b.h) / TILE) - 1 };
                if (!seen.has(key(node))) {
                  seen.add(key(node));
                  queue.push(node);
                }
                break;
              }
            }
            void fail;
          }
        }
      }
    }
  }

  const ok = reachedGoal && reachedCheckpoint;
  return {
    ok,
    reachedGoal,
    reachedCheckpoint,
    nodes: seen.size,
    maxX,
    message: ok ? 'OK' : `Nicht durchspielbar: weiteste Spalte ${maxX}, Ziel ${reachedGoal}, Checkpoint ${reachedCheckpoint}`,
  };
}
