import Phaser from 'phaser';
import { FIXED_DT, TILE } from '../config';
import { Body, Solid, moveBody, rectOverlap } from '../physics/collision';
import type { GameScene } from '../scenes/GameScene';
import { sfx } from '../audio/sfx';

export type EnemyKind = 'walker' | 'pot' | 'flier' | 'thrower' | 'spiky';
type State = 'walk' | 'shell' | 'shellMove' | 'flat' | 'flip' | 'gone';

const GRAV = 1100;

export class Enemy {
  sprite: Phaser.GameObjects.Sprite;
  body: Body;
  dir: -1 | 1 = -1;
  state: State = 'walk';
  active = false;
  t = 0;
  stateT = 0;
  baseX: number;
  baseY: number;
  range: number;
  throwT = 1.5;
  onGround = false;
  /** Panzer-Topf: Kombozähler für abgeräumte Gegner */
  potCombo = 0;
  /** Kick-Schutz, damit der Topf den Spieler nicht direkt trifft */
  kickGrace = 0;

  constructor(private scene: GameScene, public kind: EnemyKind, tx: number, ty: number, range: number) {
    const w = 12;
    const h = kind === 'flier' ? 12 : 14;
    this.body = { x: tx * TILE + (TILE - w) / 2, y: (ty + 1) * TILE - h, w, h, vx: 0, vy: 0 };
    this.baseX = this.body.x;
    this.baseY = this.body.y;
    this.range = range;
    const tex = { walker: 'zyroo', pot: 'zyroo-pot', flier: 'zyroo-fly', thrower: 'zyroo', spiky: 'zyroo-spike' }[kind];
    this.sprite = scene.add.sprite(0, 0, tex, 0).setOrigin(0.5, 1).setDepth(15).setVisible(false);
    if (kind === 'flier') this.sprite.setOrigin(0.5, 0.85);
  }

  get alive(): boolean {
    return this.state !== 'flip' && this.state !== 'gone' && this.state !== 'flat';
  }

  get harmful(): boolean {
    if (!this.alive) return false;
    if (this.state === 'shell') return false;
    return true;
  }

  get speed(): number {
    switch (this.kind) {
      case 'spiky': return 24;
      case 'pot': return 28;
      default: return 32;
    }
  }

  activateIfVisible(camLeft: number, camRight: number): void {
    if (this.active || this.state === 'gone') return;
    if (this.body.x < camRight + 24 && this.body.x + this.body.w > camLeft - 24) {
      this.active = true;
      this.sprite.setVisible(true);
      // Zu Beginn auf den Spieler zu laufen
      this.dir = this.scene.player.cx < this.body.x ? -1 : 1;
    }
  }

  update(): void {
    if (!this.active || this.state === 'gone') return;
    const dt = FIXED_DT;
    this.t += dt;
    this.stateT += dt;
    this.kickGrace = Math.max(0, this.kickGrace - dt);
    const b = this.body;
    const g = this.scene.grid;

    if (this.state === 'flip') {
      b.vy = Math.min(b.vy + GRAV * dt, 400);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y > this.scene.levelBottom + 32) this.remove();
      return;
    }
    if (this.state === 'flat') {
      if (this.stateT > 0.5) this.remove();
      return;
    }

    if (this.kind === 'flier') {
      // Sinus-Schweben mit Bart-Propeller, Patrouille
      const span = this.range * TILE;
      b.x += this.dir * 26 * dt;
      if (b.x < this.baseX - span) this.dir = 1;
      if (b.x > this.baseX + span) this.dir = -1;
      b.y = this.baseY - 8 + Math.sin(this.t * 2.4) * 22;
      return;
    }

    if (this.kind === 'thrower') {
      const pl = this.scene.player;
      this.dir = pl.cx < b.x + b.w / 2 ? -1 : 1;
      b.vx = 0;
      this.throwT -= dt;
      const dist = Math.abs(pl.cx - (b.x + b.w / 2));
      if (this.throwT <= 0 && dist < 220) {
        this.throwT = 2.2;
        this.stateT = 0;
        this.scene.throwBanana(b.x + b.w / 2, b.y - 2, pl.cx, pl.bottom);
        sfx('throw');
      }
    } else if (this.state === 'walk') {
      b.vx = this.dir * this.speed;
    } else if (this.state === 'shell') {
      b.vx = 0;
      if (this.stateT > 6) {
        // Wieder herauskommen
        this.state = 'walk';
        this.stateT = 0;
        this.dir = this.scene.player.cx < b.x ? -1 : 1;
      }
    } else if (this.state === 'shellMove') {
      b.vx = this.dir * 190;
    }

    b.vy = Math.min(b.vy + GRAV * dt, 400);
    const c = moveBody(b, dt, g, { platforms: this.scene.platformBodies, minX: 0, maxX: g.cols * TILE });
    this.onGround = c.down;
    if (c.left || c.right) {
      this.dir = c.left ? 1 : -1;
      if (this.state === 'shellMove') {
        sfx('bump');
        // Topf trifft Block von der Seite → Block anstoßen
        const tx = Math.floor((c.left ? b.x - 1 : b.x + b.w + 1) / TILE);
        const ty = Math.floor((b.y + b.h / 2) / TILE);
        if (this.scene.isOnScreen(b.x)) this.scene.hitBlockFromSide(tx, ty);
      }
    }
    // An Kanten umdrehen (Panzer & Stachel)
    if (this.onGround && this.state === 'walk' && (this.kind === 'pot' || this.kind === 'spiky')) {
      const aheadX = this.dir > 0 ? b.x + b.w + 1 : b.x - 1;
      const tx = Math.floor(aheadX / TILE);
      const ty = Math.floor((b.y + b.h + 2) / TILE);
      if (g.solidAt(tx, ty) === Solid.None && !this.platformBelow(aheadX, b.y + b.h + 2)) this.dir = (-this.dir) as -1 | 1;
    }
    if (b.y > this.scene.levelBottom + 16) this.remove();
  }

  private platformBelow(x: number, y: number): boolean {
    return this.scene.platformBodies.some((p) => x >= p.x && x <= p.x + p.w && Math.abs(y - p.y) < 4);
  }

  /** Spieler springt drauf. Rückgabe: 'ok' | 'hurt' (Stacheln) */
  stomp(): 'ok' | 'hurt' | 'kick' {
    if (this.kind === 'spiky') return 'hurt';
    if (this.kind === 'pot') {
      if (this.state === 'walk') {
        this.state = 'shell';
        this.stateT = 0;
        this.body.vx = 0;
        return 'ok';
      }
      if (this.state === 'shell') return 'kick';
      if (this.state === 'shellMove') {
        this.state = 'shell';
        this.stateT = 0;
        return 'ok';
      }
    }
    if (this.kind === 'flier' || this.kind === 'thrower') {
      this.flip(0);
      return 'ok';
    }
    this.state = 'flat';
    this.stateT = 0;
    return 'ok';
  }

  kick(fromX: number): void {
    this.dir = fromX < this.body.x + this.body.w / 2 ? 1 : -1;
    this.state = 'shellMove';
    this.stateT = 0;
    this.kickGrace = 0.25;
    this.potCombo = 0;
    sfx('kick');
  }

  flip(vx: number): void {
    this.state = 'flip';
    this.body.vy = -220;
    this.body.vx = vx;
    this.sprite.setFlipY(true);
  }

  remove(): void {
    this.state = 'gone';
    this.sprite.setVisible(false);
  }

  overlaps(b: Body): boolean {
    const a = this.body;
    return rectOverlap(a.x + 1, a.y + 1, a.w - 2, a.h - 1, b.x, b.y, b.w, b.h);
  }

  render(): void {
    if (!this.active || this.state === 'gone') return;
    const b = this.body;
    const s = this.sprite;
    s.setPosition(Math.round(b.x + b.w / 2), Math.round(b.y + b.h));
    const walkF = Math.floor(this.t * 6) % 2;
    switch (this.kind) {
      case 'walker':
        s.setFrame(this.state === 'flat' ? 2 : walkF);
        break;
      case 'thrower':
        s.setFrame(this.stateT < 0.3 && this.t > 0.5 ? 4 : this.throwT < 0.5 ? 3 : 0);
        break;
      case 'spiky':
        s.setFrame(walkF);
        break;
      case 'pot':
        if (this.state === 'walk') s.setFrame(walkF);
        else if (this.state === 'shellMove') s.setFrame(2 + (Math.floor(this.t * 16) % 3));
        else if (this.state === 'shell') s.setFrame(this.stateT > 4.5 && Math.floor(this.t * 10) % 2 ? 5 : 2);
        else s.setFrame(2);
        break;
      case 'flier':
        s.setFrame(Math.floor(this.t * 14) % 3);
        break;
    }
    if (this.state === 'walk' || this.kind === 'thrower' || this.kind === 'flier') s.setFlipX(this.dir > 0);
  }
}
