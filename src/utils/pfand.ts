/** Pfand-Zähler: rechnet in Cent, um Rundungsfehler zu vermeiden. */
export const BOTTLE_CENTS = 25;
export const BOTTLES_PER_LIFE = 100;

export class PfandCounter {
  private bottles = 0;

  constructor(initialBottles = 0) {
    this.bottles = Math.max(0, Math.floor(initialBottles)) % BOTTLES_PER_LIFE;
  }

  get count(): number {
    return this.bottles;
  }

  get cents(): number {
    return this.bottles * BOTTLE_CENTS;
  }

  /** Fügt Flaschen hinzu und liefert die Anzahl gewonnener Extraleben. */
  add(n = 1): number {
    this.bottles += n;
    let lives = 0;
    while (this.bottles >= BOTTLES_PER_LIFE) {
      this.bottles -= BOTTLES_PER_LIFE;
      lives++;
    }
    return lives;
  }

  format(): string {
    return formatEuro(this.cents);
  }
}

/** 1250 → "12,50 €" */
export function formatEuro(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return `${euros},${rest.toString().padStart(2, '0')} €`;
}
