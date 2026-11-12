import { START_LIVES } from './config';
import { PfandCounter } from './utils/pfand';
import { loadSave, updateSave } from './utils/storage';

/** Laufender Spielstand (eine "Partie"). */
export class RunStateImpl {
  lives = START_LIVES;
  score = 0;
  pfand = new PfandCounter();
  power: 0 | 1 | 2 = 0;
  stage = 0;
  time = 300;
  checkpoint = false;
  bossHp = 0;
  bossMax = 0;
  bossName = '';

  newRun(): void {
    this.lives = START_LIVES;
    this.score = 0;
    this.pfand = new PfandCounter();
    this.power = 0;
    this.checkpoint = false;
  }

  loadFromSave(): boolean {
    const r = loadSave().run;
    if (!r) return false;
    this.lives = Math.max(1, r.lives);
    this.score = r.score;
    this.pfand = new PfandCounter(r.bottles);
    this.power = r.power;
    return true;
  }

  persist(): void {
    updateSave((s) => {
      s.run = { lives: this.lives, score: this.score, bottles: this.pfand.count, power: this.power };
      if (this.score > s.highscore) s.highscore = this.score;
    });
  }

  addScore(n: number): void {
    this.score += n;
  }
}

export const Run = new RunStateImpl();
