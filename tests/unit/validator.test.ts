import { describe, expect, it } from 'vitest';
import { validateRows } from '../../src/levels/validator';

function level(mid: string[]): string[] {
  // 14 Zeilen: Start links, Ziel rechts, Mittelteil variabel
  const left = ['..........', '..@.......', 'XXXXXXXXXX', 'XXXXXXXXXX'];
  const right = ['................', '...C....G.......', 'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX'];
  const rows: string[] = [];
  for (let y = 0; y < 14; y++) {
    const l = y < 10 ? '..........' : left[y - 10];
    const r = y < 10 ? '................' : right[y - 10];
    rows.push(l + mid[y] + r);
  }
  return rows;
}

const blank = (w: number) => '.'.repeat(w);
const ground = (w: number) => 'X'.repeat(w);

describe('Level-Validator', () => {
  it('flacher Weg ist durchspielbar', () => {
    const mid = Array.from({ length: 14 }, (_, y) => (y >= 12 ? ground(10) : blank(10)));
    expect(validateRows(level(mid)).ok).toBe(true);
  });

  it('3er-Lücke ist machbar', () => {
    const mid = Array.from({ length: 14 }, (_, y) => (y >= 12 ? 'XXX...XXXX' : blank(10)));
    expect(validateRows(level(mid)).ok).toBe(true);
  });

  it('9er-Lücke ist NICHT machbar', () => {
    const mid = Array.from({ length: 14 }, (_, y) => (y >= 12 ? '.........X' : blank(10)));
    expect(validateRows(level(mid)).ok).toBe(false);
  });

  it('6 Kacheln hohe Wand ist NICHT machbar', () => {
    const mid = Array.from({ length: 14 }, (_, y) => (y >= 6 ? 'XXXXXXXXXX' : blank(10)));
    expect(validateRows(level(mid)).ok).toBe(false);
  });

  it('3 Kacheln hohe Stufe ist machbar', () => {
    const mid = Array.from({ length: 14 }, (_, y) => (y >= 9 ? '....XXXXXX' : y >= 12 ? ground(10) : blank(10)));
    const rows = level(mid).map((r, y) => (y >= 9 && y < 12 ? r.slice(0, 20) + 'XXXXXX' + r.slice(26) : r));
    expect(validateRows(rows).ok).toBe(true);
  });

  it('breite Lava-Grube ist NICHT machbar', () => {
    const mid = Array.from({ length: 14 }, (_, y) => (y >= 12 ? 'LLLLLLLLLX' : blank(10)));
    expect(validateRows(level(mid)).ok).toBe(false);
  });

  it('bewegliche Plattform überbrückt große Lücke', () => {
    const mid = Array.from({ length: 14 }, (_, y) => (y === 11 ? '...-3.....' : y >= 12 ? '.........X' : blank(10)));
    expect(validateRows(level(mid)).ok).toBe(true);
  });
});
