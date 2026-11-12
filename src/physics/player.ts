import { Body, Contacts, Platform, Solid, TileGrid, moveBody, overlapsSolid } from './collision';
import { TILE } from '../config';

/** Alle Spielgefühl-Parameter an einem Ort (px, s). */
export const PHYS = {
  WALK_MAX: 84,
  RUN_MAX: 144,
  ACCEL_WALK: 380,
  ACCEL_RUN: 470,
  AIR_ACCEL_MUL: 0.85,
  FRICTION: 420,
  AIR_FRICTION: 160,
  SKID_DECEL: 1050,
  JUMP_V: 360,
  JUMP_RUN_BONUS: 36,
  GRAVITY_HOLD: 960,
  GRAVITY_RELEASE: 2600,
  GRAVITY_FALL: 1800,
  MAX_FALL: 380,
  COYOTE: 0.1,
  BUFFER: 0.12,
  STOMP_BOUNCE: 250,
  STOMP_BOUNCE_HELD: 390,
  CORNER: 4,
  SMALL_W: 10,
  SMALL_H: 14,
  BIG_W: 12,
  BIG_H: 26,
  DUCK_H: 14,
};

export interface PlayerInput {
  left: boolean;
  right: boolean;
  down: boolean;
  up: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  run: boolean;
}

export const NO_INPUT: PlayerInput = {
  left: false, right: false, down: false, up: false, jumpHeld: false, jumpPressed: false, run: false,
};

export interface PlayerPhys {
  body: Body;
  facing: 1 | -1;
  onGround: boolean;
  coyoteT: number;
  bufferT: number;
  jumping: boolean;
  ducking: boolean;
  skidding: boolean;
  big: boolean;
  platform: Platform | null;
  dropT: number;
}

export interface StepResult {
  jumped: boolean;
  landed: boolean;
  contacts: Contacts;
}

export function createPlayerPhys(centerX: number, bottomY: number, big = false): PlayerPhys {
  const w = big ? PHYS.BIG_W : PHYS.SMALL_W;
  const h = big ? PHYS.BIG_H : PHYS.SMALL_H;
  return {
    body: { x: centerX - w / 2, y: bottomY - h, w, h, vx: 0, vy: 0 },
    facing: 1,
    onGround: false,
    coyoteT: 0,
    bufferT: 0,
    jumping: false,
    ducking: false,
    skidding: false,
    big,
    platform: null,
    dropT: 0,
  };
}

function setHitbox(p: PlayerPhys, w: number, h: number): void {
  const b = p.body;
  const cx = b.x + b.w / 2;
  const bottom = b.y + b.h;
  b.w = w;
  b.h = h;
  b.x = cx - w / 2;
  b.y = bottom - h;
}

/** Wechsel Klein ↔ Groß. Bei zu wenig Platz wird geduckt. */
export function setBig(p: PlayerPhys, big: boolean, grid: TileGrid): void {
  p.big = big;
  if (big) {
    setHitbox(p, PHYS.BIG_W, PHYS.BIG_H);
    if (overlapsSolid(grid, p.body.x, p.body.y, p.body.w, p.body.h)) {
      p.ducking = true;
      setHitbox(p, PHYS.BIG_W, PHYS.DUCK_H);
    }
  } else {
    p.ducking = false;
    setHitbox(p, PHYS.SMALL_W, PHYS.SMALL_H);
  }
}

function standingOnOneWay(p: PlayerPhys, grid: TileGrid): boolean {
  if (p.platform) return true;
  const b = p.body;
  const ty = Math.floor((b.y + b.h + 1) / TILE);
  const x0 = Math.floor(b.x / TILE);
  const x1 = Math.floor((b.x + b.w - 0.01) / TILE);
  let any = false;
  for (let tx = x0; tx <= x1; tx++) {
    const s = grid.solidAt(tx, ty);
    if (s === Solid.Full) return false;
    if (s === Solid.OneWay) any = true;
  }
  return any;
}

export interface StepOptions {
  minX?: number;
  maxX?: number;
  platforms?: readonly Platform[];
}

/** Ein fester Physikschritt für den Spieler. */
export function stepPlayer(
  p: PlayerPhys,
  input: PlayerInput,
  dt: number,
  grid: TileGrid,
  opts: StepOptions = {},
): StepResult {
  const b = p.body;
  const wasGround = p.onGround;
  let jumped = false;

  // Von Plattform mitgetragen werden
  if (p.platform && p.onGround) {
    b.x += p.platform.dx;
    b.y += p.platform.dy;
  }

  // ---- Ducken ----
  const wantDuck = input.down && p.onGround;
  if (p.big) {
    if (wantDuck && !p.ducking) {
      p.ducking = true;
      setHitbox(p, PHYS.BIG_W, PHYS.DUCK_H);
    } else if (!wantDuck && p.ducking && p.onGround) {
      if (!overlapsSolid(grid, b.x, b.y + b.h - PHYS.BIG_H, b.w, PHYS.BIG_H)) {
        p.ducking = false;
        setHitbox(p, PHYS.BIG_W, PHYS.BIG_H);
      }
    }
  } else {
    p.ducking = wantDuck;
  }

  // ---- Horizontal ----
  let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (p.ducking && p.onGround) dir = 0;
  const max = input.run ? PHYS.RUN_MAX : PHYS.WALK_MAX;
  const accel = (input.run ? PHYS.ACCEL_RUN : PHYS.ACCEL_WALK) * (p.onGround ? 1 : PHYS.AIR_ACCEL_MUL);
  p.skidding = false;
  if (dir !== 0) {
    if (b.vx !== 0 && Math.sign(b.vx) === -dir) {
      const dec = p.onGround ? PHYS.SKID_DECEL : PHYS.SKID_DECEL * 0.55;
      b.vx += dir * dec * dt;
      if (Math.sign(b.vx) === dir) b.vx = dir * Math.min(Math.abs(b.vx), 10);
      p.skidding = p.onGround && Math.abs(b.vx) > 30;
    } else if (Math.abs(b.vx) < max) {
      b.vx += dir * accel * dt;
      if (Math.abs(b.vx) > max) b.vx = dir * max;
    } else {
      const f = (p.onGround ? PHYS.FRICTION : PHYS.AIR_FRICTION) * dt;
      b.vx = Math.sign(b.vx) * Math.max(max, Math.abs(b.vx) - f);
    }
    if (p.onGround || b.vx === 0 || Math.sign(b.vx) === dir) p.facing = dir as 1 | -1;
  } else {
    const f = (p.onGround ? PHYS.FRICTION : PHYS.AIR_FRICTION) * dt;
    if (Math.abs(b.vx) <= f) b.vx = 0;
    else b.vx -= Math.sign(b.vx) * f;
  }

  // ---- Sprung: Jump Buffer + Coyote Time ----
  p.bufferT = input.jumpPressed ? PHYS.BUFFER : Math.max(0, p.bufferT - dt);
  if (p.onGround) p.coyoteT = PHYS.COYOTE;
  else p.coyoteT = Math.max(0, p.coyoteT - dt);
  p.dropT = Math.max(0, p.dropT - dt);

  if (p.bufferT > 0 && p.coyoteT > 0) {
    if (input.down && p.onGround && standingOnOneWay(p, grid)) {
      p.dropT = 0.22; // durch Einweg-Plattform fallen
      p.bufferT = 0;
      p.coyoteT = 0;
      p.onGround = false;
      p.platform = null;
    } else {
      const speedFactor = Math.min(1, Math.abs(b.vx) / PHYS.RUN_MAX);
      b.vy = -(PHYS.JUMP_V + PHYS.JUMP_RUN_BONUS * speedFactor);
      p.jumping = true;
      p.bufferT = 0;
      p.coyoteT = 0;
      p.onGround = false;
      p.platform = null;
      jumped = true;
    }
  }

  // ---- Schwerkraft (höher beim Fallen / nach Loslassen) ----
  let g: number;
  if (b.vy < 0) g = p.jumping && input.jumpHeld ? PHYS.GRAVITY_HOLD : PHYS.GRAVITY_RELEASE;
  else {
    g = PHYS.GRAVITY_FALL;
    p.jumping = false;
  }
  b.vy = Math.min(b.vy + g * dt, PHYS.MAX_FALL);

  // ---- Bewegen + Kollision ----
  const contacts = moveBody(b, dt, grid, {
    cornerCorrection: PHYS.CORNER,
    dropThrough: p.dropT > 0,
    minX: opts.minX,
    maxX: opts.maxX,
    platforms: opts.platforms,
  });

  p.onGround = contacts.down;
  p.platform = contacts.platform;
  if (contacts.up) p.jumping = false;

  return { jumped, landed: !wasGround && p.onGround, contacts };
}

/** Abprallen nach Draufspringen auf Gegner. */
export function stompBounce(p: PlayerPhys, jumpHeld: boolean): void {
  p.body.vy = -(jumpHeld ? PHYS.STOMP_BOUNCE_HELD : PHYS.STOMP_BOUNCE);
  p.jumping = jumpHeld;
  p.onGround = false;
  p.coyoteT = 0;
  p.platform = null;
}
