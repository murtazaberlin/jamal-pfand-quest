import Phaser from 'phaser';
import { normalizeText } from '../gfx/font';

export interface TextOpts {
  color?: number;
  shadow?: number | false;
  align?: 'left' | 'center' | 'right';
  scale?: number;
  depth?: number;
  scroll?: boolean; // false → an Kamera fixiert
}

/** Pixel-Text mit optionalem Schatten. */
export class PText extends Phaser.GameObjects.Container {
  private main: Phaser.GameObjects.BitmapText;
  private shadowText: Phaser.GameObjects.BitmapText | null;
  private alignMode: 'left' | 'center' | 'right';
  private raw = '';

  constructor(scene: Phaser.Scene, x: number, y: number, str: string, o: TextOpts = {}) {
    super(scene, x, y);
    const scale = o.scale ?? 1;
    this.alignMode = o.align ?? 'left';
    this.shadowText = null;
    if (o.shadow !== false) {
      this.shadowText = scene.add.bitmapText(scale, scale, 'font', '', 8 * scale);
      this.shadowText.setTint(o.shadow ?? 0x1b1022);
      this.add(this.shadowText);
    }
    this.main = scene.add.bitmapText(0, 0, 'font', '', 8 * scale);
    this.main.setTint(o.color ?? 0xffffff);
    this.add(this.main);
    if (o.depth !== undefined) this.setDepth(o.depth);
    if (o.scroll === false) this.setScrollFactor(0);
    scene.add.existing(this);
    this.setText(str);
  }

  setText(s: string): this {
    if (s === this.raw) return this;
    this.raw = s;
    const t = normalizeText(s);
    this.main.setText(t);
    this.shadowText?.setText(t);
    const align = this.alignMode === 'center' ? 1 : this.alignMode === 'right' ? 2 : 0;
    this.main.align = align;
    if (this.shadowText) this.shadowText.align = align;
    const w = this.main.width;
    const ox = this.alignMode === 'center' ? -Math.floor(w / 2) : this.alignMode === 'right' ? -w : 0;
    this.main.x = ox;
    if (this.shadowText) this.shadowText.x = ox + (this.main.fontSize / 8);
    return this;
  }

  get text(): string {
    return this.raw;
  }

  setColor(c: number): this {
    this.main.setTint(c);
    return this;
  }

  get textWidth(): number {
    return this.main.width;
  }
}

export function ptext(scene: Phaser.Scene, x: number, y: number, s: string, o: TextOpts = {}): PText {
  return new PText(scene, x, y, s, o);
}
