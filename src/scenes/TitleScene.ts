import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { Menu } from '../ui/menu';
import { ptext } from '../ui/text';
import { loadSave } from '../utils/storage';
import { Run } from '../state';
import { music } from '../audio/music';
import { fadeTo } from '../ui/transition';
import { setTouchVisible } from '../ui/touch';
import { Controls } from '../utils/controls';
import { JAMAL_FRAMES } from '../gfx/sprites';

/** Titelbildschirm mit animiertem Jamal, der vor einem ZYROO davonläuft. */
export class TitleScene extends Phaser.Scene {
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private jamal!: Phaser.GameObjects.Sprite;
  private zyroo!: Phaser.GameObjects.Sprite;
  private bottle!: Phaser.GameObjects.Image;
  private menu!: Menu;
  private t = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    setTouchVisible(false);
    this.cameras.main.setBackgroundColor(0x2a1a4a);
    this.layers = [0, 1, 2].map((i) => this.add.tileSprite(0, 0, GAME_W, GAME_H, `bg0-${i}`).setOrigin(0, 0));
    // Boden
    const g = this.add.graphics();
    for (let x = 0; x < GAME_W; x += 16) {
      g.fillStyle(0xd89a58).fillRect(x, 184, 16, 32);
      g.fillStyle(0xf0c878).fillRect(x, 184, 16, 4);
      g.fillStyle(0x1b1022).fillRect(x, 184, 16, 1);
    }
    // Logo
    const logoY = 22;
    const logo = ptext(this, GAME_W / 2, logoY, 'JAMAL', { align: 'center', scale: 4, color: 0xf0c048, shadow: 0x8a2020 });
    ptext(this, GAME_W / 2, logoY + 38, '– PFAND QUEST –', { align: 'center', scale: 2, color: 0x5ce65c, shadow: 0x1b1022 });
    this.tweens.add({ targets: logo, y: logoY + 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Sombrero über dem Logo
    const hat = this.add.graphics();
    hat.fillStyle(0x1b1022).fillRect(GAME_W / 2 - 30, 14, 60, 5).fillRect(GAME_W / 2 - 13, 4, 26, 11);
    hat.fillStyle(0xf0c048).fillRect(GAME_W / 2 - 29, 15, 58, 3).fillRect(GAME_W / 2 - 12, 5, 24, 10);
    hat.fillStyle(0xd8283c).fillRect(GAME_W / 2 - 12, 11, 24, 2);
    hat.fillStyle(0x1f9a4a).fillRect(GAME_W / 2 - 8, 11, 4, 2).fillRect(GAME_W / 2 + 4, 11, 4, 2);
    hat.setAlpha(0);

    this.jamal = this.add.sprite(-20, 184, 'jamal-b', JAMAL_FRAMES.run0).setOrigin(0.5, 1);
    this.zyroo = this.add.sprite(-60, 184, 'zyroo', 0).setOrigin(0.5, 1).setFlipX(true);
    this.bottle = this.add.image(-40, 170, 'bottle', 0);

    const save = loadSave();
    const hasRun = save.unlocked > 0 || save.cleared.length > 0 || !!save.run;
    this.menu = new Menu(this, [
      { label: () => 'NEUES SPIEL', onSelect: () => this.newGame() },
      { label: () => 'WEITER', onSelect: () => this.continueGame(), disabled: () => !hasRun },
      { label: () => 'OPTIONEN', onSelect: () => this.openOptions() },
      { label: () => 'ABSPANN', onSelect: () => fadeTo(this, 'Credits', { won: false }), disabled: () => save.cleared.length === 0 },
    ], GAME_W / 2, 96, 13);
    if (hasRun) {
      this.menu.index = 1;
      this.menu.refresh();
    }
    ptext(this, GAME_W / 2, 196, `HIGHSCORE ${String(save.highscore).padStart(7, '0')}`, { align: 'center', color: 0xfff2a8 });
    ptext(this, GAME_W / 2, 206, '© 2026 EIN EIGENES SPIEL – ALLE ASSETS PROZEDURAL', { align: 'center', color: 0x9a8aa8 });
    music.play('title');
    this.cameras.main.fadeIn(300);
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      setTouchVisible(false);
      this.menu.active = true;
    });
    (window as unknown as { __JAMAL__?: object }).__JAMAL__ = { scene: 'Title' };
  }

  private newGame(): void {
    Run.newRun();
    Run.persist();
    this.menu.active = false;
    fadeTo(this, 'Map', { justCleared: -1 });
  }

  private continueGame(): void {
    if (!Run.loadFromSave()) Run.newRun();
    this.menu.active = false;
    fadeTo(this, 'Map', { justCleared: -1 });
  }

  private openOptions(): void {
    this.menu.active = false;
    this.scene.launch('Options', { from: 'Title' });
    this.scene.sleep();
  }

  override update(_t: number, delta: number): void {
    const dt = delta / 1000;
    this.t += dt;
    this.layers.forEach((l, i) => (l.tilePositionX += [4, 12, 30][i] * dt));
    // Verfolgungsjagd quer über den Bildschirm
    const cycle = 9;
    const p = (this.t % cycle) / cycle;
    const x = -30 + p * (GAME_W + 120);
    this.jamal.x = Math.round(x);
    this.jamal.setFrame([JAMAL_FRAMES.run0, JAMAL_FRAMES.run1, JAMAL_FRAMES.run2, JAMAL_FRAMES.run1][Math.floor(this.t * 12) % 4]);
    const hop = Math.abs(Math.sin(this.t * 3)) < 0.15 ? -6 : 0;
    this.jamal.y = 184 + hop;
    this.zyroo.x = Math.round(x - 46);
    this.zyroo.setFrame(Math.floor(this.t * 8) % 2);
    this.bottle.x = Math.round(x + 30);
    this.bottle.y = 172 + Math.sin(this.t * 4) * 2;
    this.menu.update(dt);
    if (Controls.keyPressedOnce('Escape')) this.menu.index = 0;
  }
}
