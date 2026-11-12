import { describe, expect, it } from 'vitest';
import { PfandCounter, formatEuro } from '../../src/utils/pfand';

describe('Pfand-Zähler', () => {
  it('jede Flasche ist 0,25 €', () => {
    const p = new PfandCounter();
    p.add(50);
    expect(p.cents).toBe(1250);
    expect(p.format()).toBe('12,50 €');
  });

  it('100 Flaschen = Extraleben, Zähler läuft über', () => {
    const p = new PfandCounter(99);
    expect(p.add(1)).toBe(1);
    expect(p.count).toBe(0);
    expect(p.format()).toBe('0,00 €');
  });

  it('mehrere Leben bei großem Bonus', () => {
    const p = new PfandCounter(90);
    expect(p.add(215)).toBe(3);
    expect(p.count).toBe(5);
  });

  it('formatiert Euro korrekt', () => {
    expect(formatEuro(0)).toBe('0,00 €');
    expect(formatEuro(25)).toBe('0,25 €');
    expect(formatEuro(2475)).toBe('24,75 €');
  });
});
