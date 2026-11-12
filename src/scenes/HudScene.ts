import Phaser from 'phaser';
import { GAME_W } from '../config';
import { Run } from '../state';
import { stageLabel } from '../levels';
import { PText, ptext } from '../ui/text';

/** HUD: Leben, Pfand in €, Punkte, Welt-Level, Zeit (+ Boss-Lebensbalken). */
export class HudScene extends Phaser.Scene {
  private vals!: PText[];
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossLabel!: PText;
  private bottleIcon!: Phaser.GameObjects.Image;

  constructor() {
    super('Hud');
  }

  create(): void {
    const labels = ['JAMAL', 'PFAND', 'PUNKTE', 'WELT', 'ZEIT'];
    const xs = [8, 84, 186, 270, 334];
    labels.forEach((l, i) => ptext(this, xs[i], 3, l, { color: 0xfff2a8 }));
    this.vals = xs.map((x) => ptext(this, x, 12, ''));
    this.bottleIcon = this.add.image(76, 15, 'bottle', 0).setScale(0.75);
    this.bossBar = this.add.graphics();
    this.bossLabel = ptext(this, GAME_W / 2, 24, '', { align: 'center', color: 0xff8080 });
  }

  override update(): void {
    this.vals[0].setText(`×${String(Run.lives).padStart(2, '0')}`);
    this.vals[1].setText(Run.pfand.format());
    this.vals[2].setText(String(Run.score).padStart(7, '0'));
    this.vals[3].setText(stageLabel(Run.stage));
    this.vals[4].setText(String(Math.ceil(Run.time)).padStart(3, '0'));
    this.vals[4].setColor(Run.time <= 100 ? 0xff8080 : 0xffffff);
    void this.bottleIcon;
    const g = this.bossBar;
    g.clear();
    if (Run.bossMax > 0) {
      this.bossLabel.setText(Run.bossName);
      const w = 120;
      const x = GAME_W / 2 - w / 2;
      const y = 34;
      g.fillStyle(0x1b1022).fillRect(x - 2, y - 2, w + 4, 9);
      g.fillStyle(0x4a2030).fillRect(x, y, w, 5);
      const seg = w / Run.bossMax;
      for (let i = 0; i < Run.bossHp; i++) {
        const phaseCol = i < 3 ? 0xff4040 : i < 6 ? 0xff9a30 : 0xffd23f;
        g.fillStyle(phaseCol).fillRect(Math.round(x + i * seg) + 1, y, Math.round(seg) - 2, 5);
      }
    } else this.bossLabel.setText('');
  }
}
