import { describe, expect, it } from 'vitest';
import { STAGES } from '../../src/levels';
import { parseRows } from '../../src/levels/loader';
import { validateRows } from '../../src/levels/validator';
import { TK } from '../../src/levels/types';

describe('Level-Daten', () => {
  it('8 Level + 4 Bosse', () => {
    expect(STAGES.length).toBe(12);
    expect(STAGES.filter((s) => s.boss !== undefined).length).toBe(4);
  });

  for (const [i, def] of STAGES.entries()) {
    describe(`${def.id} ${def.name}`, () => {
      it('alle Zeilen gleich breit', () => {
        const w = def.rows[0].length;
        def.rows.forEach((r, y) => expect(r.length, `Zeile ${y}`).toBe(w));
        if (def.bonus) def.bonus.rows.forEach((r, y) => expect(r.length, `Bonus Zeile ${y}`).toBe(def.bonus!.rows[0].length));
      });

      it('hat Start und Ziel bzw. Boss', () => {
        const p = parseRows(def.rows);
        expect(def.rows.join('').includes('@')).toBe(true);
        if (def.boss !== undefined) expect(p.boss).not.toBeNull();
        else {
          expect(p.goal).not.toBeNull();
          expect(p.checkpoint, 'Checkpoint fehlt').not.toBeNull();
          // Platz für Cantina hinter dem Ziel
          expect(p.grid.cols - p.goal!.tx).toBeGreaterThanOrEqual(10);
        }
      });

      it('ist mit kleinem Jamal durchspielbar (Physik-Simulation)', () => {
        const r = validateRows(def.rows);
        expect(r.ok, r.message).toBe(true);
      });

      it('ist mit großem Jamal durchspielbar', () => {
        const r = validateRows(def.rows, { big: true });
        expect(r.ok, r.message).toBe(true);
      });

      if (def.bonus) {
        it('Bonusraum: Ausgang erreichbar, Rückkehr-Spalte ist ein Brunnen', () => {
          const r = validateRows(def.bonus!.rows, { targetWell: true });
          expect(r.ok, r.message).toBe(true);
          const p = parseRows(def.rows);
          const col = def.bonus!.returnCol;
          let found = false;
          for (let ty = 0; ty < p.grid.rows; ty++) if (p.grid.get(col, ty) === TK.WellTL) found = true;
          expect(found, `Spalte ${col} ist kein Brunnen`).toBe(true);
          // Es gibt einen Eingangs-Brunnen
          let wells = 0;
          for (let ty = 0; ty < p.grid.rows; ty++) for (let tx = 0; tx < p.grid.cols; tx++) if (p.grid.get(tx, ty) === TK.WellTL) wells++;
          expect(wells).toBeGreaterThanOrEqual(2);
        });
      }
      void i;
    });
  }
});
