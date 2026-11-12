import Phaser from 'phaser';
import { FIXED_DT, TILE } from '../config';
import { Body, moveBody, rectOverlap } from '../physics/collision';
import type { GameScene } from '../scenes/GameScene';

export type ItemKind = 'taco' | 'chili' | 'star' | 'mask';
const ITEM_FRAME: Record<ItemKind, number> = { taco: 0, chili: 1, star: 2, mask: 3 };

/** Power-up, das aus einem Block wächst und sich dann bewegt. */
export class Item {
  sprite: Phaser.GameObjects.Sprite;
  body: Body;
  emergeT = 0.55;
  dir: 1 | -1 = 1;
  dead = false;
  private startY: number;

  constructor(private scene: GameScene, public kind: ItemKind, tx: number, ty: number) {
    this.body = { x: tx * TILE + 2, y: ty * TILE + 2, w: 12, h: 14, vx: 0, vy: 0 };
    this.startY = ty * TILE;
    this.sprite = scene.add.sprite(0, 0, 'items', ITEM_FRAME[kind]).setOrigin(0.5, 1).setDepth(9);
    this.dir = scene.player.cx < tx * TILE + 8 ? 1 : -1;
    if (kind === 'chili') this.dir = 1;
  }

  update(): void {
    if (this.dead) return;
    const dt = FIXED_DT;
    const b = this.body;
    if (this.emergeT > 0) {
      this.emergeT -= dt;
      b.y = this.startY + 2 - (1 - Math.max(0, this.emergeT) / 0.55) * 16;
      return;
    }
    const g = this.scene.grid;
    switch (this.kind) {
      case 'chili':
        // Chili hüpft auf der Stelle
        b.vx = 0;
        break;
      case 'star':
        b.vx = this.dir * 70;
        break;
      default:
        b.vx = this.dir * 60;
    }
    b.vy = Math.min(b.vy + 1000 * dt, 380);
    const c = moveBody(b, dt, g, { platforms: this.scene.platformBodies, minX: 0, maxX: g.cols * TILE });
    if (c.left) this.dir = 1;
    if (c.right) this.dir = -1;
    if (c.down) {
      if (this.kind === 'star') b.vy = -300;
      if (this.kind === 'chili') b.vy = -140;
    }
    if (b.y > this.scene.levelBottom + 16) this.kill();
  }

  /** Von unten angestoßener Block unter dem Item → hüpfen */
  bump(): void {
    this.body.vy = -260;
    this.dir = (-this.dir) as 1 | -1;
  }

  render(): void {
    const b = this.body;
    this.sprite.setPosition(Math.round(b.x + b.w / 2), Math.round(b.y + b.h));
    if (this.kind === 'star') this.sprite.setTint(Math.floor(this.scene.time.now / 60) % 2 ? 0xffffff : 0xfff0a0);
  }

  kill(): void {
    this.dead = true;
    this.sprite.destroy();
  }
}

/** Chili-Feuerball: prallt auf dem Boden ab. */
export class Fireball {
  sprite: Phaser.GameObjects.Sprite;
  body: Body = { x: 0, y: 0, w: 6, h: 6, vx: 0, vy: 0 };
  dead = true;
  life = 0;

  constructor(private scene: GameScene) {
    this.sprite = scene.add.sprite(0, 0, 'fireball', 0).setDepth(21).setVisible(false);
  }

  fire(x: number, y: number, dir: number): void {
    this.dead = false;
    this.life = 0;
    this.body.x = x - 3;
    this.body.y = y - 3;
    this.body.vx = dir * 230;
    this.body.vy = 80;
    this.sprite.setVisible(true);
  }

  update(): void {
    if (this.dead) return;
    const dt = FIXED_DT;
    const b = this.body;
    this.life += dt;
    b.vy = Math.min(b.vy + 1100 * dt, 400);
    const vx = b.vx;
    const c = moveBody(b, dt, this.scene.grid, { platforms: this.scene.platformBodies });
    if (c.down) b.vy = -200;
    if (c.up) b.vy = 60;
    if (c.left || c.right || this.life > 2 || b.y > this.scene.levelBottom || !this.scene.isOnScreen(b.x, 16)) {
      this.explode(c.left || c.right);
      return;
    }
    b.vx = vx;
  }

  explode(visible = true): void {
    if (this.dead) return;
    this.dead = true;
    this.sprite.setVisible(false);
    if (visible) this.scene.puff(this.body.x + 3, this.body.y + 3);
  }

  render(): void {
    if (this.dead) return;
    this.sprite.setPosition(Math.round(this.body.x + 3), Math.round(this.body.y + 3));
    this.sprite.setFrame(Math.floor(this.life * 16) % 2);
    this.sprite.setAngle(Math.floor(this.life * 12) * 90);
  }
}

/** Bananenschale von Wurf-ZYROO bzw. Boss. Bleibt kurz liegen. */
export class Banana {
  sprite: Phaser.GameObjects.Sprite;
  body: Body;
  dead = false;
  lying = false;
  t = 0;

  constructor(private scene: GameScene, x: number, y: number, vx: number, vy: number, private big = false) {
    this.body = { x: x - 4, y: y - 4, w: 8, h: 6, vx, vy };
    this.sprite = scene.add.sprite(x, y, big ? 'bossfx' : 'banana', big ? 1 : 0).setDepth(16);
  }

  update(): void {
    if (this.dead) return;
    const dt = FIXED_DT;
    this.t += dt;
    const b = this.body;
    if (this.lying) {
      if (this.t > 2.5) this.kill();
      return;
    }
    b.vy = Math.min(b.vy + 700 * dt, 340);
    const c = moveBody(b, dt, this.scene.grid, { platforms: this.scene.platformBodies });
    if (c.left || c.right) b.vx = -b.vx * 0.3;
    if (c.down) {
      if (this.big) {
        this.scene.puff(b.x + 4, b.y + 4);
        this.kill();
        return;
      }
      this.lying = true;
      this.t = 0;
      b.vx = 0;
      this.sprite.setFrame(2);
      this.sprite.setAngle(0);
    }
    if (b.y > this.scene.levelBottom + 16) this.kill();
  }

  hits(o: Body): boolean {
    const b = this.body;
    return !this.dead && rectOverlap(b.x, b.y, b.w, b.h, o.x, o.y, o.w, o.h);
  }

  render(): void {
    if (this.dead) return;
    this.sprite.setPosition(Math.round(this.body.x + 4), Math.round(this.body.y + 3));
    if (!this.lying) {
      if (this.big) this.sprite.setAngle(Math.floor(this.t * 10) * 45);
      else this.sprite.setFrame(Math.floor(this.t * 10) % 2);
    } else if (this.t > 2) this.sprite.setAlpha(Math.floor(this.t * 20) % 2 ? 0.3 : 1);
  }

  kill(): void {
    this.dead = true;
    this.sprite.destroy();
  }
}

/** Boss-Geschosse: Feuer (fliegt gerade) und Schockwelle (läuft am Boden). */
export class BossShot {
  sprite: Phaser.GameObjects.Sprite;
  body: Body;
  dead = false;
  t = 0;

  constructor(private scene: GameScene, public kind: 'fire' | 'shock', x: number, y: number, vx: number, vy: number) {
    const w = kind === 'fire' ? 10 : 12;
    const h = kind === 'fire' ? 10 : 12;
    this.body = { x: x - w / 2, y: y - h, w, h, vx, vy };
    this.sprite = scene.add.sprite(x, y, 'bossfx', kind === 'fire' ? 0 : 2).setOrigin(0.5, 1).setDepth(17);
  }

  update(): void {
    if (this.dead) return;
    const dt = FIXED_DT;
    this.t += dt;
    const b = this.body;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (this.t > 4 || b.x < -32 || b.x > this.scene.levelRight + 32 || b.y > this.scene.levelBottom + 16) this.kill();
    // Schockwelle endet an Wänden
    if (this.kind === 'shock') {
      const tx = Math.floor((b.vx > 0 ? b.x + b.w : b.x) / TILE);
      const ty = Math.floor((b.y + b.h / 2) / TILE);
      if (this.scene.grid.solidAt(tx, ty) === 1) this.kill();
    }
  }

  hits(o: Body): boolean {
    const b = this.body;
    return !this.dead && rectOverlap(b.x + 1, b.y + 1, b.w - 2, b.h - 2, o.x, o.y, o.w, o.h);
  }

  render(): void {
    if (this.dead) return;
    this.sprite.setPosition(Math.round(this.body.x + this.body.w / 2), Math.round(this.body.y + this.body.h));
    if (this.kind === 'shock') this.sprite.setFrame(2 + (Math.floor(this.t * 12) % 2));
    else this.sprite.setAngle(Math.floor(this.t * 12) * 90);
  }

  kill(): void {
    if (this.dead) return;
    this.dead = true;
    this.sprite.destroy();
  }
}
