import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { Menu } from '../ui/menu';
import { ptext } from '../ui/text';
import { Controls } from '../utils/controls';
import { music } from '../audio/music';
import { Run } from '../state';
import { setTouchVisible } from '../ui/touch';

export class PauseScene extends Phaser.Scene {
  private menu!: Menu;
  private label = '';

  constructor() {
    super('Pause');
  }

  init(data: { label?: string }): void {
    this.label = data.label ?? '';
  }

  create(): void {
    setTouchVisible(false);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x07040b, 0.7).setOrigin(0, 0);
    ptext(this, GAME_W / 2, 46, 'PAUSE', { align: 'center', scale: 3, color: 0xf0c048 });
    ptext(this, GAME_W / 2, 76, this.label, { align: 'center', color: 0xfff2a8 });
    this.menu = new Menu(this, [
      { label: () => 'WEITER', onSelect: () => this.resume() },
      { label: () => 'OPTIONEN', onSelect: () => this.options() },
      { label: () => 'ZUR WELTKARTE', onSelect: () => this.quit('Map') },
      { label: () => 'ZUM TITEL', onSelect: () => this.quit('Title') },
    ], GAME_W / 2, 100, 14);
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      this.menu.active = true;
      setTouchVisible(false);
    });
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume('Game');
    setTouchVisible(true);
    music.resume();
  }

  private options(): void {
    this.menu.active = false;
    this.scene.launch('Options', { from: 'Pause' });
    this.scene.sleep();
  }

  private quit(to: string): void {
    Run.checkpoint = false;
    Run.persist();
    music.stop();
    this.scene.stop('Game');
    this.scene.stop('Hud');
    this.scene.stop();
    this.scene.start(to, { justCleared: -1 });
  }

  override update(_t: number, delta: number): void {
    if (Controls.pressed('pause')) {
      this.resume();
      return;
    }
    this.menu.update(delta / 1000);
  }
}
