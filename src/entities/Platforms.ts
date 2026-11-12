import Phaser from 'phaser';
import { FIXED_DT, TILE } from '../config';
import { Platform } from '../physics/collision';
import type { GameScene } from '../scenes/GameScene';

export type PlatformKind = 'h' | 'v' | 'fall' | 'cart';

/** Bewegliche Plattform, Fallplattform oder Lore. */
export class MovingPlatform implements Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  dx = 0;
  dy = 0;
  sprite: Phaser.GameObjects.Image;
  private t = 0;
  private ox: number;
  private oy: number;
  private fallT = -1;
  private vy = 0;
  gone = false;
  private standing = false;

  constructor(private scene: GameScene, public kind: PlatformKind, tx: number, ty: number, private range: number, world: number) {
    this.w = kind === 'fall' || kind === 'cart' ? 32 : 48;
    this.h = 8;
    this.x = tx * TILE;
    this.y = ty * TILE;
    this.ox = this.x;
    this.oy = this.y;
    if (kind === 'cart') {
      this.sprite = scene.add.image(this.x, this.y, 'minecart').setOrigin(0, 0).setDepth(8);
    } else if (kind === 'fall') {
      this.sprite = scene.add.image(this.x, this.y, 'fallplat', 0).setOrigin(0, 0).setDepth(8);
    } else {
      this.sprite = scene.add.image(this.x, this.y, 'platform', world).setOrigin(0, 0).setDepth(8);
    }
    // Phasenversatz, damit nicht alle synchron laufen
    this.t = (tx * 0.37) % (Math.PI * 2);
  }

  onStand(): void {
    if (this.kind === 'fall' && this.fallT < 0) this.fallT = 0;
    this.standing = true;
  }

  update(): void {
    const dt = FIXED_DT;
    const px = this.x;
    const py = this.y;
    if (this.gone) {
      this.dx = 0;
      this.dy = 0;
      return;
    }
    switch (this.kind) {
      case 'h':
      case 'cart': {
        this.t += dt * (this.kind === 'cart' ? 0.9 : 1.1);
        const span = this.range * TILE;
        // Dreieckswelle → konstante Geschwindigkeit, weiche Umkehr
        const s = (2 / Math.PI) * Math.asin(Math.sin(this.t * (60 / Math.max(span, 16))));
        this.x = this.ox + s * span;
        break;
      }
      case 'v': {
        this.t += dt * 1.1;
        const span = this.range * TILE;
        const s = (2 / Math.PI) * Math.asin(Math.sin(this.t * (50 / Math.max(span, 16))));
        this.y = this.oy + s * span;
        break;
      }
      case 'fall':
        if (this.fallT >= 0) {
          this.fallT += dt;
          if (this.fallT > 0.45) {
            this.vy = Math.min(this.vy + 900 * dt, 300);
            this.y += this.vy * dt;
            if (this.y > this.scene.levelBottom + 32) {
              this.gone = true;
              this.sprite.setVisible(false);
              this.y = -9999;
            }
          }
        }
        break;
    }
    this.dx = this.x - px;
    this.dy = this.y - py;
    this.standing = false;
  }

  render(): void {
    let shake = 0;
    if (this.kind === 'fall' && this.fallT >= 0 && this.fallT < 0.45) {
      shake = Math.floor(this.fallT * 30) % 2 ? 1 : -1;
      this.sprite.setFrame(1);
    }
    this.sprite.setPosition(Math.round(this.x + shake), Math.round(this.kind === 'cart' ? this.y - 0 : this.y));
    void this.standing;
  }
}
