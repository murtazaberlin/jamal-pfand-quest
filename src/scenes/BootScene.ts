import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { createFont } from '../gfx/font';
import { createSprites } from '../gfx/sprites';
import { createTiles } from '../gfx/tiles';
import { createBackgrounds } from '../gfx/backgrounds';

/** Ladebildschirm: erzeugt alle Grafiken prozedural, schrittweise mit Fortschrittsbalken. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const g = this.add.graphics();
    const steps: Array<[string, () => void]> = [
      ['Schrift', () => createFont(this)],
      ['Jamal & ZYROO', () => createSprites(this)],
      ['Kacheln', () => createTiles(this)],
      ['Hintergründe', () => createBackgrounds(this)],
    ];
    let i = 0;
    const draw = (label: string) => {
      g.clear();
      g.fillStyle(0x1b1022).fillRect(0, 0, GAME_W, GAME_H);
      // Sombrero-Symbol
      g.fillStyle(0xf0c048).fillRect(GAME_W / 2 - 18, 80, 36, 4).fillRect(GAME_W / 2 - 8, 70, 16, 10);
      g.fillStyle(0xd8283c).fillRect(GAME_W / 2 - 8, 77, 16, 2);
      g.fillStyle(0x3a2a4a).fillRect(GAME_W / 2 - 80, 110, 160, 8);
      g.fillStyle(0x239a48).fillRect(GAME_W / 2 - 79, 111, Math.round((158 * i) / steps.length), 6);
      void label;
    };
    const next = () => {
      if (i >= steps.length) {
        this.scene.start(new URLSearchParams(location.search).has('gallery') ? 'Gallery' : 'Title');
        return;
      }
      const [label, fn] = steps[i];
      draw(label);
      fn();
      i++;
      draw(label);
      this.time.delayedCall(16, next);
    };
    draw('');
    this.time.delayedCall(16, next);
  }
}
