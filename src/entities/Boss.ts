import Phaser from 'phaser';
import { FIXED_DT, TILE } from '../config';
import { Body, moveBody, rectOverlap } from '../physics/collision';
import type { GameScene } from '../scenes/GameScene';
import { sfx } from '../audio/sfx';
import { Run } from '../state';

type BossState = 'intro' | 'idle' | 'windup' | 'whip' | 'jumpPrep' | 'jump' | 'rain' | 'fire' | 'hurt' | 'dying' | 'dead';
type Attack = 'whip' | 'jump' | 'rain' | 'fire';

export const BOSS_HP = 9;

/**
 * MEGA-ZYROO: 3 Phasen (je 3 TP). Jede Welt fügt ein Angriffsmuster hinzu:
 * Welt 1 Bart-Peitsche, Welt 2 + Sprung-Schockwelle, Welt 3 + Bananenregen, Welt 4 + Feuerbart.
 */
export class Boss {
  sprite: Phaser.GameObjects.Sprite;
  body: Body;
  hp = BOSS_HP;
  state: BossState = 'intro';
  stateT = 0;
  dir: -1 | 1 = -1;
  t = 0;
  fireHits = 0;
  private attackQueue: Attack[] = [];
  private lastAttack: Attack | null = null;
  private rainLeft = 0;
  private rainT = 0;
  private shotsLeft = 0;
  private onGround = false;

  constructor(private scene: GameScene, public variant: number, tx: number, ty: number) {
    this.body = { x: tx * TILE - 16, y: (ty + 1) * TILE - 44, w: 32, h: 44, vx: 0, vy: 0 };
    this.sprite = scene.add.sprite(0, 0, `boss${variant}`, 0).setOrigin(0.5, 1).setDepth(14);
    Run.bossHp = this.hp;
    Run.bossMax = BOSS_HP;
    Run.bossName = 'MEGA-ZYROO';
  }

  get phase(): number {
    return this.hp > 6 ? 1 : this.hp > 3 ? 2 : 3;
  }

  get speedMul(): number {
    return [1, 1, 1.3, 1.65][this.phase];
  }

  get alive(): boolean {
    return this.state !== 'dying' && this.state !== 'dead';
  }

  get vulnerable(): boolean {
    return this.alive && this.state !== 'hurt' && this.state !== 'intro';
  }

  private attacks(): Attack[] {
    const pool: Attack[] = ['whip'];
    if (this.variant >= 1 || this.phase >= 3) pool.push('jump');
    if (this.variant >= 2) pool.push('rain');
    if (this.variant >= 3) pool.push('fire');
    return pool;
  }

  private set(s: BossState): void {
    this.state = s;
    this.stateT = 0;
  }

  private chooseAttack(): Attack {
    if (this.attackQueue.length) return this.attackQueue.shift()!;
    const pool = this.attacks();
    let a = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && a === this.lastAttack) a = pool[(pool.indexOf(a) + 1) % pool.length];
    // Phase 3: Kombos aus zwei Angriffen
    if (this.phase === 3 && pool.length > 1) {
      const b = pool[(pool.indexOf(a) + 1) % pool.length];
      this.attackQueue.push(b);
    }
    this.lastAttack = a;
    return a;
  }

  update(): void {
    const dt = FIXED_DT;
    this.t += dt;
    this.stateT += dt;
    const b = this.body;
    const pl = this.scene.player;
    const sm = this.speedMul;

    if (this.state === 'dead') return;
    if (this.state === 'dying') {
      b.vy = Math.min(b.vy + 600 * dt, 300);
      b.y += b.vy * dt;
      if (this.stateT > 0.1 && Math.floor(this.stateT * 10) !== Math.floor((this.stateT - dt) * 10)) {
        this.scene.beardBurst(b.x + Math.random() * b.w, b.y + Math.random() * b.h);
        this.scene.shake(60, 0.006);
      }
      if (this.stateT > 2.5) {
        this.set('dead');
        this.sprite.setVisible(false);
        this.scene.onBossDefeated();
      }
      return;
    }

    switch (this.state) {
      case 'intro':
        if (this.stateT > 0.2 && this.stateT - dt <= 0.2) {
          sfx('bossRoar');
          this.scene.shake(500, 0.01);
        }
        if (this.stateT > 1.6) this.set('idle');
        b.vx = 0;
        break;
      case 'idle': {
        this.dir = pl.cx < b.x + b.w / 2 ? -1 : 1;
        const dist = Math.abs(pl.cx - (b.x + b.w / 2));
        b.vx = dist > 50 ? this.dir * 34 * sm : 0;
        if (this.stateT > 1.3 / sm) {
          const a = this.chooseAttack();
          if (a === 'whip') this.set('windup');
          else if (a === 'jump') this.set('jumpPrep');
          else if (a === 'rain') {
            this.set('rain');
            this.rainLeft = 5 + this.phase * 2;
            this.rainT = 0.3;
            sfx('bossRoar');
          } else {
            this.set('fire');
            this.shotsLeft = 2 + this.phase;
          }
        }
        break;
      }
      case 'windup':
        b.vx = 0;
        if (this.stateT > 0.55 / sm) {
          this.set('whip');
          sfx('whip');
        }
        break;
      case 'whip':
        b.vx = this.dir * 60;
        if (this.stateT > 0.4) this.set('idle');
        break;
      case 'jumpPrep':
        b.vx = 0;
        if (this.stateT > 0.4 / sm) {
          this.set('jump');
          b.vy = -430;
          const dx = pl.cx - (b.x + b.w / 2);
          b.vx = Phaser.Math.Clamp(dx * 1.1, -160, 160);
          this.onGround = false;
        }
        break;
      case 'jump':
        if (this.onGround && this.stateT > 0.1) {
          b.vx = 0;
          sfx('shock');
          this.scene.shake(250, 0.012);
          const y = b.y + b.h;
          const sp = 120 * sm;
          this.scene.bossShot('shock', b.x, y, -sp, 0);
          this.scene.bossShot('shock', b.x + b.w, y, sp, 0);
          this.set('idle');
        }
        break;
      case 'rain':
        b.vx = 0;
        this.rainT -= dt;
        if (this.rainT <= 0 && this.rainLeft > 0) {
          this.rainLeft--;
          this.rainT = 0.32 / sm;
          const camL = this.scene.cameras.main.scrollX;
          // Mischung: zufällig + gezielt auf den Spieler
          const x = this.rainLeft % 3 === 0 ? pl.cx : camL + 24 + Math.random() * 336;
          this.scene.bananaDrop(x);
        }
        if (this.rainLeft <= 0 && this.stateT > 1) this.set('idle');
        break;
      case 'fire':
        b.vx = 0;
        this.dir = pl.cx < b.x + b.w / 2 ? -1 : 1;
        if (this.stateT > 0.5 && this.shotsLeft > 0 && Math.floor(this.stateT * 4) !== Math.floor((this.stateT - dt) * 4)) {
          this.shotsLeft--;
          const mx = b.x + b.w / 2 + this.dir * 10;
          const my = b.y + 28;
          const ang = Math.atan2(pl.body.y + pl.body.h / 2 - my, pl.cx - mx) + (Math.random() - 0.5) * 0.3;
          const sp = 130 * sm;
          this.scene.bossShot('fire', mx, my + 5, Math.cos(ang) * sp, Math.sin(ang) * sp);
          sfx('chili');
        }
        if (this.shotsLeft <= 0 && this.stateT > 1.2) this.set('idle');
        break;
      case 'hurt':
        b.vx = -this.dir * 40;
        if (this.stateT > 1.0) this.set('idle');
        break;
    }

    b.vy = Math.min(b.vy + 1200 * dt, 420);
    const c = moveBody(b, dt, this.scene.grid, { minX: 0, maxX: this.scene.levelRight });
    this.onGround = c.down;
  }

  /** Bart-Peitschen-Trefferzone */
  whipBox(): Body | null {
    if (this.state !== 'whip') return null;
    const b = this.body;
    const w = 30;
    return { x: this.dir > 0 ? b.x + b.w - 4 : b.x - w + 4, y: b.y + 24, w, h: 10, vx: 0, vy: 0 };
  }

  overlaps(o: Body): boolean {
    const b = this.body;
    return this.alive && rectOverlap(b.x + 3, b.y + 6, b.w - 6, b.h - 6, o.x, o.y, o.w, o.h);
  }

  /** Kopf-Treffer durch Draufspringen */
  headHit(o: Body, vy: number, prevBottom: number): boolean {
    const b = this.body;
    if (!this.vulnerable || vy <= 0) return false;
    if (!rectOverlap(b.x, b.y, b.w, b.h, o.x, o.y, o.w, o.h)) return false;
    return prevBottom <= b.y + 12;
  }

  damage(n = 1): void {
    if (!this.vulnerable) return;
    this.hp = Math.max(0, this.hp - n);
    Run.bossHp = this.hp;
    sfx('bossHit');
    this.scene.shake(220, 0.014);
    this.scene.hitStop(8);
    this.attackQueue = [];
    if (this.hp <= 0) {
      this.set('dying');
      this.body.vy = -200;
      Run.addScore(10000);
      this.scene.scorePopup(this.body.x + 16, this.body.y, 10000);
      return;
    }
    this.set('hurt');
  }

  fireHit(): void {
    if (!this.vulnerable) return;
    this.fireHits++;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.sprite.clearTint());
    if (this.fireHits >= 4) {
      this.fireHits = 0;
      this.damage(1);
    }
  }

  render(): void {
    if (this.state === 'dead') return;
    const b = this.body;
    const s = this.sprite;
    s.setPosition(Math.round(b.x + b.w / 2), Math.round(b.y + b.h + 4));
    let f = 0;
    switch (this.state) {
      case 'idle': f = Math.abs(b.vx) > 1 ? 1 + (Math.floor(this.t * 6) % 2) : 0; break;
      case 'windup': case 'jumpPrep': case 'rain': f = 2; break;
      case 'whip': f = 3; break;
      case 'jump': f = 1; break;
      case 'fire': f = 5; break;
      case 'hurt': case 'dying': f = 4; break;
      case 'intro': f = this.stateT > 0.2 && this.stateT < 1.2 ? 5 : 0; break;
    }
    s.setFrame(f);
    s.setFlipX(this.dir > 0);
    const blink = (this.state === 'windup' || this.state === 'jumpPrep') && Math.floor(this.t * 16) % 2 === 0;
    if (this.state === 'hurt') s.setAlpha(Math.floor(this.t * 20) % 2 ? 0.4 : 1);
    else s.setAlpha(1);
    if (blink) s.setTint(0xff8080);
    else if (!s.isTinted || this.fireHits === 0) s.clearTint();
    if (this.state === 'dying') s.setAngle(Math.sin(this.t * 30) * 6);
  }
}
