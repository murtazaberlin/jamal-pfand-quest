import Phaser from 'phaser';
import { Controls } from '../utils/controls';
import { sfx } from '../audio/sfx';
import { PText, ptext } from './text';

export interface MenuItem {
  label: () => string;
  onSelect?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  disabled?: () => boolean;
}

/** Vertikales Menü: Tastatur/Gamepad (hoch/runter/bestätigen, links/rechts) + Antippen. */
export class Menu {
  private texts: PText[] = [];
  private cursor: PText;
  index = 0;
  active = true;
  private zones: Phaser.GameObjects.Zone[] = [];
  private repeatT = 0;

  constructor(
    scene: Phaser.Scene,
    private items: MenuItem[],
    private x: number,
    private y: number,
    private spacing = 12,
    private center = true,
    depth = 50,
  ) {
    items.forEach((it, i) => {
      const t = ptext(scene, x, y + i * spacing, it.label(), { align: center ? 'center' : 'left', depth });
      t.setScrollFactor(0);
      this.texts.push(t);
      const z = scene.add.zone(x, y + i * spacing + 4, 200, spacing).setScrollFactor(0).setInteractive({ useHandCursor: true });
      if (!center) z.setPosition(x + 80, y + i * spacing + 4);
      z.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!this.active) return;
        const item = this.items[i];
        if (item.disabled?.()) return;
        if (this.index === i || item.onSelect) {
          this.index = i;
          // Antippen links/rechts der Mitte → Wert ändern
          if (item.onLeft && item.onRight) {
            const localX = p.x - (this.center ? this.x : this.x + 80);
            if (localX < -10) item.onLeft();
            else item.onRight();
            sfx('move');
          } else if (item.onSelect) {
            sfx('select');
            item.onSelect();
          }
        }
        this.index = i;
        this.refresh();
      });
      this.zones.push(z);
    });
    this.cursor = ptext(scene, 0, 0, '>', { color: 0xffd23f, depth });
    this.cursor.setScrollFactor(0);
    this.refresh();
  }

  refresh(): void {
    this.items.forEach((it, i) => {
      const t = this.texts[i];
      t.setText(it.label());
      const dis = it.disabled?.() ?? false;
      t.setColor(dis ? 0x6a6a7a : i === this.index ? 0xffd23f : 0xffffff);
    });
    const t = this.texts[this.index];
    const w = t.textWidth;
    const left = this.center ? this.x - Math.floor(w / 2) : this.x;
    this.cursor.setPosition(left - 10, this.y + this.index * this.spacing);
  }

  update(dt: number): void {
    if (!this.active || Controls.isCapturing()) return;
    let moved = 0;
    const holdUp = Controls.down('up') && !Controls.down('jump');
    if (Controls.pressed('down')) moved = 1;
    else if (Controls.pressed('up') && holdUp) moved = -1;
    else if (Controls.keyPressedOnce('ArrowUp') || Controls.keyPressedOnce('KeyW')) moved = -1;
    if (Controls.down('down') || Controls.down('up')) {
      this.repeatT += dt;
      if (this.repeatT > 0.4) {
        this.repeatT = 0.3;
        moved = Controls.down('down') ? 1 : -1;
      }
    } else this.repeatT = 0;
    if (moved !== 0) {
      let n = this.index;
      for (let k = 0; k < this.items.length; k++) {
        n = (n + moved + this.items.length) % this.items.length;
        if (!this.items[n].disabled?.()) break;
      }
      this.index = n;
      sfx('move');
      this.refresh();
    }
    const item = this.items[this.index];
    if (Controls.pressed('left') && item.onLeft) {
      item.onLeft();
      sfx('move');
      this.refresh();
    }
    if (Controls.pressed('right') && item.onRight) {
      item.onRight();
      sfx('move');
      this.refresh();
    }
    const confirm = Controls.keyPressedOnce('Enter') || Controls.keyPressedOnce('Space') ||
      (Controls.pressed('jump') && !Controls.keyPressedOnce('ArrowUp') && !Controls.keyPressedOnce('KeyW'));
    if (confirm && item.onSelect && !item.disabled?.()) {
      sfx('select');
      item.onSelect();
      this.refresh();
    }
  }

  setVisible(v: boolean): void {
    this.texts.forEach((t) => t.setVisible(v));
    this.cursor.setVisible(v);
    this.zones.forEach((z) => (v ? z.setInteractive() : z.disableInteractive()));
    this.active = v;
  }

  destroy(): void {
    this.texts.forEach((t) => t.destroy());
    this.zones.forEach((z) => z.destroy());
    this.cursor.destroy();
  }
}
