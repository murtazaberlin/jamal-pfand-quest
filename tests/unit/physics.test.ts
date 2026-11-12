import { describe, expect, it } from 'vitest';
import { Solid, TileGrid, moveBody, Platform } from '../../src/physics/collision';
import { NO_INPUT, PHYS, PlayerInput, createPlayerPhys, stepPlayer } from '../../src/physics/player';
import { FIXED_DT, TILE } from '../../src/config';

/** Testgrid aus ASCII: X = voll, = = Einweg */
function grid(rows: string[]): TileGrid {
  return {
    cols: rows[0].length,
    rows: rows.length,
    solidAt(tx, ty) {
      const c = rows[ty]?.[tx];
      if (c === 'X') return Solid.Full;
      if (c === '=') return Solid.OneWay;
      return Solid.None;
    },
  };
}

const FLAT = grid([
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  'XXXXXXXXXXXXXXXXXXXX',
]);

function input(p: Partial<PlayerInput>): PlayerInput {
  return { ...NO_INPUT, ...p };
}

function settle(p: ReturnType<typeof createPlayerPhys>, g: TileGrid, frames = 30) {
  for (let i = 0; i < frames; i++) stepPlayer(p, NO_INPUT, FIXED_DT, g);
}

describe('Kollision', () => {
  it('landet sauber auf dem Boden', () => {
    const p = createPlayerPhys(40, 40);
    settle(p, FLAT, 60);
    expect(p.onGround).toBe(true);
    expect(p.body.y + p.body.h).toBeCloseTo(6 * TILE, 5);
  });

  it('bleibt nicht an Kachelfugen hängen (Laufen über flachen Boden)', () => {
    const p = createPlayerPhys(24, 6 * TILE);
    settle(p, FLAT);
    for (let i = 0; i < 120; i++) stepPlayer(p, input({ right: true }), FIXED_DT, FLAT);
    expect(p.body.x).toBeGreaterThan(24 + 100);
    expect(p.onGround).toBe(true);
  });

  it('stoppt an Wänden', () => {
    const g = grid([
      '..........',
      '..........',
      '......X...',
      '......X...',
      'XXXXXXXXXX',
    ]);
    const p = createPlayerPhys(24, 4 * TILE);
    settle(p, g);
    for (let i = 0; i < 120; i++) stepPlayer(p, input({ right: true }), FIXED_DT, g);
    expect(p.body.x + p.body.w).toBeCloseTo(6 * TILE, 5);
  });

  it('Einweg-Plattform: von unten durchspringen, oben landen', () => {
    const g = grid([
      '..........',
      '..........',
      '..........',
      '...====...',
      '..........',
      '..........',
      'XXXXXXXXXX',
    ]);
    const p = createPlayerPhys(5 * TILE, 6 * TILE);
    settle(p, g);
    stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, g);
    for (let i = 0; i < 90; i++) stepPlayer(p, input({ jumpHeld: true }), FIXED_DT, g);
    expect(p.onGround).toBe(true);
    expect(p.body.y + p.body.h).toBeCloseTo(3 * TILE, 5);
  });

  it('Ecken-Korrektur schiebt am Blockrand vorbei', () => {
    const g = grid([
      '..........',
      '..........',
      '....X.....',
      '..........',
      '..........',
      'XXXXXXXXXX',
    ]);
    // Spieler rechts neben Block, überlappt nur 2 px mit der Blockkante
    const p = createPlayerPhys(5 * TILE + PHYS.SMALL_W / 2 - 2, 5 * TILE);
    settle(p, g);
    stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, g);
    let bumped = false;
    for (let i = 0; i < 30; i++) {
      const r = stepPlayer(p, input({ jumpHeld: true }), FIXED_DT, g);
      if (r.contacts.up) bumped = true;
    }
    expect(bumped).toBe(false);
    expect(p.body.y).toBeLessThan(3 * TILE);
  });

  it('Kopfstoß meldet getroffene Kachel', () => {
    const g = grid([
      '..........',
      '..........',
      '....X.....',
      '..........',
      '..........',
      'XXXXXXXXXX',
    ]);
    const p = createPlayerPhys(4 * TILE + 8, 5 * TILE);
    settle(p, g);
    stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, g);
    let hit: { tx: number; ty: number } | undefined;
    for (let i = 0; i < 30 && !hit; i++) {
      const r = stepPlayer(p, input({ jumpHeld: true }), FIXED_DT, g);
      hit = r.contacts.headTiles[0];
    }
    expect(hit).toEqual({ tx: 4, ty: 2 });
  });

  it('wird von beweglichen Plattformen getragen', () => {
    const g = grid(['..........', '..........', '..........', '..........', '..........']);
    const plat: Platform = { x: 16, y: 48, w: 48, h: 8, dx: 0, dy: 0 };
    const p = createPlayerPhys(40, 40);
    for (let i = 0; i < 30; i++) stepPlayer(p, NO_INPUT, FIXED_DT, g, { platforms: [plat] });
    expect(p.onGround).toBe(true);
    const x0 = p.body.x;
    for (let i = 0; i < 30; i++) {
      plat.dx = 1;
      plat.x += 1;
      stepPlayer(p, NO_INPUT, FIXED_DT, g, { platforms: [plat] });
    }
    expect(p.body.x - x0).toBeCloseTo(30, 3);
    expect(p.onGround).toBe(true);
  });

  it('moveBody: fällt in Abgrund, wenn kein Boden', () => {
    const g = grid(['....', '....']);
    const b = { x: 0, y: 0, w: 10, h: 10, vx: 0, vy: 200 };
    for (let i = 0; i < 30; i++) moveBody(b, FIXED_DT, g);
    expect(b.y).toBeGreaterThan(32);
  });
});

describe('Sprung', () => {
  it('variable Sprunghöhe: kurz gedrückt springt niedriger als lang', () => {
    const hTap = jumpHeight(2);
    const hHold = jumpHeight(60);
    expect(hHold).toBeGreaterThan(hTap * 1.8);
    expect(hHold).toBeGreaterThan(3.5 * TILE);
    expect(hHold).toBeLessThan(5 * TILE);
  });

  it('Coyote Time: kurz nach Kante noch springen', () => {
    const g = grid([
      '..........',
      '..........',
      '..........',
      '..........',
      'XXX.......',
    ]);
    const p = createPlayerPhys(2.5 * TILE, 4 * TILE);
    settle(p, g);
    p.body.vx = PHYS.WALK_MAX;
    // laufe über die Kante
    let framesOff = 0;
    for (let i = 0; i < 60; i++) {
      stepPlayer(p, input({ right: true }), FIXED_DT, g);
      if (!p.onGround) {
        framesOff++;
        if (framesOff === 4) break; // ~66 ms nach der Kante
      }
    }
    const r = stepPlayer(p, input({ right: true, jumpPressed: true, jumpHeld: true }), FIXED_DT, g);
    expect(r.jumped).toBe(true);
  });

  it('Coyote Time läuft ab (~100 ms)', () => {
    const g = grid(['..........', '..........', '..........', '..........', 'XXX.......']);
    const p = createPlayerPhys(2.5 * TILE, 4 * TILE);
    settle(p, g);
    p.body.vx = PHYS.WALK_MAX;
    let framesOff = 0;
    for (let i = 0; i < 60; i++) {
      stepPlayer(p, input({ right: true }), FIXED_DT, g);
      if (!p.onGround && ++framesOff === 9) break; // 150 ms
    }
    const r = stepPlayer(p, input({ right: true, jumpPressed: true, jumpHeld: true }), FIXED_DT, g);
    expect(r.jumped).toBe(false);
  });

  it('Jump Buffer: Sprung kurz vor Landung wird ausgeführt', () => {
    const p = createPlayerPhys(40, 3 * TILE);
    // in der Luft, fallend
    stepPlayer(p, NO_INPUT, FIXED_DT, FLAT);
    let frames = 0;
    // fallen bis knapp über Boden
    while (p.body.y + p.body.h < 6 * TILE - 8 && frames < 200) {
      stepPlayer(p, NO_INPUT, FIXED_DT, FLAT);
      frames++;
    }
    expect(p.onGround).toBe(false);
    stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, FLAT);
    let jumped = false;
    for (let i = 0; i < 6; i++) {
      const r = stepPlayer(p, input({ jumpHeld: true }), FIXED_DT, FLAT);
      if (r.jumped) jumped = true;
    }
    expect(jumped).toBe(true);
  });

  it('Jump Buffer läuft ab (~120 ms)', () => {
    const p = createPlayerPhys(40, 0);
    stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, FLAT);
    let jumped = false;
    for (let i = 0; i < 120; i++) {
      const r = stepPlayer(p, input({ jumpHeld: true }), FIXED_DT, FLAT);
      if (r.jumped) jumped = true;
    }
    expect(jumped).toBe(false); // Fallzeit > Buffer
  });

  it('kein Doppelsprung in der Luft', () => {
    const p = createPlayerPhys(40, 6 * TILE);
    settle(p, FLAT);
    stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, FLAT);
    for (let i = 0; i < 15; i++) stepPlayer(p, input({ jumpHeld: true }), FIXED_DT, FLAT);
    const r = stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, FLAT);
    expect(r.jumped).toBe(false);
  });

  it('Sprint erhöht die Höchstgeschwindigkeit', () => {
    const a = createPlayerPhys(24, 6 * TILE);
    const b = createPlayerPhys(24, 6 * TILE);
    settle(a, FLAT);
    settle(b, FLAT);
    for (let i = 0; i < 90; i++) {
      stepPlayer(a, input({ right: true }), FIXED_DT, FLAT);
      stepPlayer(b, input({ right: true, run: true }), FIXED_DT, FLAT);
    }
    expect(a.body.vx).toBeCloseTo(PHYS.WALK_MAX, 3);
    expect(b.body.vx).toBeCloseTo(PHYS.RUN_MAX, 3);
  });
});

function jumpHeight(holdFrames: number): number {
  const p = createPlayerPhys(40, 6 * TILE);
  settle(p, FLAT);
  const startY = p.body.y;
  let minY = startY;
  stepPlayer(p, input({ jumpPressed: true, jumpHeld: true }), FIXED_DT, FLAT);
  for (let i = 0; i < 80; i++) {
    stepPlayer(p, input({ jumpHeld: i < holdFrames }), FIXED_DT, FLAT);
    minY = Math.min(minY, p.body.y);
  }
  return startY - minY;
}
