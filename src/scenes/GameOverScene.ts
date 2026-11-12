import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { Menu } from '../ui/menu';
import { ptext } from '../ui/text';
import { music } from '../audio/music';
import { Run } from '../state';
import { fadeTo } from '../ui/transition';
import { loadSave } from '../utils/storage';
import { setTouchVisible } from '../ui/touch';

export class GameOverScene extends Phaser.Scene {
  private menu!: Menu;
  private t = 0;
  private zyroo!: Phaser.GameObjects.Sprite;

  constructor() {
    super('GameOver');
  }

  create(): void {
    setTouchVisible(false);
    this.cameras.main.setBackgroundColor(0x07040b);
    const finalScore = Run.score;
    const best = Math.max(loadSave().highscore, finalScore);
    ptext(this, GAME_W / 2, 50, 'GAME OVER', { align: 'center', scale: 3, color: 0xff4f4f });
    ptext(this, GAME_W / 2, 84, `PUNKTE ${String(finalScore).padStart(7, '0')}`, { align: 'center' });
    ptext(this, GAME_W / 2, 96, `HIGHSCORE ${String(best).padStart(7, '0')}`, { align: 'center', color: 0xfff2a8 });
    this.zyroo = this.add.sprite(GAME_W / 2, 140, 'zyroo', 0).setScale(2);
    ptext(this, GAME_W / 2, 150, '"HEHEHE... DAS PFAND GEHÖRT MIR!"', { align: 'center', color: 0x9a9078 });
    Run.persist();
    // Neue Partie: Leben, Punkte und Pfand zurücksetzen, Freischaltungen bleiben
    Run.newRun();
    Run.persist();
    this.menu = new Menu(this, [
      { label: () => 'WEITER (WELTKARTE)', onSelect: () => fadeTo(this, 'Map', { justCleared: -1 }) },
      { label: () => 'ZUM TITEL', onSelect: () => fadeTo(this, 'Title') },
    ], GAME_W / 2, 172, 14);
    music.play('gameover');
    this.cameras.main.fadeIn(400);
  }

  override update(_t: number, delta: number): void {
    this.t += delta / 1000;
    this.zyroo.setFrame(Math.floor(this.t * 4) % 2);
    this.zyroo.y = 130 + Math.abs(Math.sin(this.t * 5)) * -4;
    this.menu.update(delta / 1000);
    void GAME_H;
  }
}
