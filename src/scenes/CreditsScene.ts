import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { ptext, PText } from '../ui/text';
import { music } from '../audio/music';
import { Controls } from '../utils/controls';
import { Run } from '../state';
import { loadSave, updateSave } from '../utils/storage';
import { setTouchVisible } from '../ui/touch';
import { JAMAL_FRAMES } from '../gfx/sprites';

const LINES = [
  '~JAMAL – PFAND QUEST',
  '',
  'DER MEGA-ZYROO IST BESIEGT!',
  'DIE WÜSTE, DER MERCADO, DIE MINE',
  'UND DIE PYRAMIDE SIND WIEDER FREI.',
  '',
  'JAMAL BRINGT ALLE PFANDFLASCHEN',
  'ZUM AUTOMATEN – UND SPENDIERT',
  'DEM GANZEN DORF TACOS.',
  '',
  '~SPIELDESIGN & CODE',
  'EIN EIGENES PROJEKT',
  '',
  '~GRAFIK',
  'PROZEDURALE PIXEL-ART',
  'IM CODE GEZEICHNET',
  '',
  '~MUSIK & SOUND',
  'EIGENER CHIPTUNE-SEQUENCER',
  'WEB AUDIO API',
  '',
  '~TECHNIK',
  'TYPESCRIPT · VITE · PHASER 3',
  '',
  '~DANKE FÜRS SPIELEN!',
  '',
  '¡VIVA JAMAL!',
];

export class CreditsScene extends Phaser.Scene {
  private texts: PText[] = [];
  private y0 = GAME_H + 10;
  private t = 0;
  private jamal!: Phaser.GameObjects.Sprite;
  private won = false;

  constructor() {
    super('Credits');
  }

  init(data: { won?: boolean }): void {
    this.won = !!data.won;
    this.t = 0;
    this.texts = [];
  }

  create(): void {
    setTouchVisible(false);
    this.cameras.main.setBackgroundColor(0x2a1a4a);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'bg0-0').setOrigin(0, 0);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'bg0-1').setOrigin(0, 0).setAlpha(0.8);
    LINES.forEach((l, i) => {
      const head = l.startsWith('~');
      const t = ptext(this, GAME_W / 2, this.y0 + i * 12, (head ? l.slice(1) : l).replace('¡', '!'), {
        align: 'center', color: head ? 0xf0c048 : 0xffffff, scale: i === 0 ? 2 : 1,
      });
      this.texts.push(t);
    });
    const score = ptext(this, GAME_W / 2, this.y0 + LINES.length * 12 + 20, `PUNKTE ${String(Run.score).padStart(7, '0')}   PFAND ${Run.pfand.format()}`, { align: 'center', color: 0x5ce65c });
    this.texts.push(score);
    this.jamal = this.add.sprite(-20, GAME_H - 8, 'jamal-b', 0).setOrigin(0.5, 1);
    music.play('credits');
    if (this.won) {
      updateSave((s) => {
        if (Run.score > s.highscore) s.highscore = Run.score;
        s.run = null;
      });
    }
    this.cameras.main.fadeIn(600);
    void loadSave;
  }

  override update(_t: number, delta: number): void {
    const dt = delta / 1000;
    this.t += dt;
    const speed = Controls.down('jump') || Controls.down('action') ? 60 : 16;
    this.texts.forEach((t) => (t.y -= speed * dt));
    this.jamal.x += 30 * dt;
    if (this.jamal.x > GAME_W + 20) this.jamal.x = -20;
    this.jamal.setFrame([JAMAL_FRAMES.run0, JAMAL_FRAMES.run1, JAMAL_FRAMES.run2, JAMAL_FRAMES.run1][Math.floor(this.t * 8) % 4]);
    const last = this.texts[this.texts.length - 1];
    if (last.y < GAME_H / 2 && Math.floor(this.t * 2) % 2 === 0) last.setColor(0xffffff);
    else if (last.y < GAME_H / 2) last.setColor(0x5ce65c);
    if (Controls.keyPressedOnce('Escape') || Controls.keyPressedOnce('Enter') || (last.y < 60 && Controls.pressed('jump'))) {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
    }
  }
}
