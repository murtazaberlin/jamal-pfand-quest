import { describe, expect, it } from 'vitest';
import * as data from '../../src/gfx/spriteData';

describe('Sprite-Daten', () => {
  for (const [name, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;
    it(`${name}: alle Zeilen gleich breit`, () => {
      const w = (rows as string[])[0].length;
      (rows as string[]).forEach((r, i) => expect(r.length, `${name} Zeile ${i}`).toBe(w));
    });
  }
});
