import Phaser from 'phaser';
import { FIXED_DT } from '../config';
import { JAMAL_FRAMES as F } from '../gfx/sprites';
import { PHYS, PlayerInput, PlayerPhys, StepResult, createPlayerPhys, setBig, stepPlayer, stompBounce } from '../physics/player';
import { Run } from '../state';
import type { GameScene } from '../scenes/GameScene';
import { sfx } from '../audio/sfx';

export type PlayerMode = 'play' | 'dead' | 'goal' | 'warp' | 'transform' | 'frozen';

const STAR_COLORS = [0xffffff, 0xffe070, 0xff8080, 0x80ff80, 0x80c0ff];

export class Player {
  phys: PlayerPhys;
  sprite: Phaser.GameObjects.Sprite;
  mode: PlayerMode = 'play';
  invulnT = 0;
  starT = 0;
  throwT = 0;
  blinkT = 2;
  animT = 0;
  deadT = 0;
  transformT = 0;
  private transformFrom = 0;
  private transformTo = 0;
  combo = 0;
  frame: number = F.idle;
  lastStep: StepResult | null = null;
  skidSoundT = 0;
  dustT = 0;

  constructor(private scene: GameScene, cx: number, bottomY: number) {
    this.phys = createPlayerPhys(cx, bottomY, Run.power > 0);
    this.sprite = scene.add.sprite(cx, bottomY, this.texKey(), 0).setOrigin(0.5, 1).setDepth(20);
  }

  get power(): 0 | 1 | 2 {
    return Run.power;
  }

  texKey(p = Run.power): string {
    return p === 0 ? 'jamal-s' : p === 1 ? 'jamal-b' : 'jamal-f';
  }

  get cx(): number {
    return this.phys.body.x + this.phys.body.w / 2;
  }

  get bottom(): number {
    return this.phys.body.y + this.phys.body.h;
  }

  get body() {
    return this.phys.body;
  }

  get invincible(): boolean {
    return this.starT > 0;
  }

  get canBeHurt(): boolean {
    return this.mode === 'play' && this.invulnT <= 0 && this.starT <= 0;
  }

  step(input: PlayerInput, minX: number, maxX: number): StepResult | null {
    const dt = FIXED_DT;
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.throwT = Math.max(0, this.throwT - dt);
    if (this.starT > 0) {
      this.starT -= dt;
      if (this.starT <= 0) this.scene.onStarEnd();
    }
    if (this.mode === 'dead') {
      this.deadT += dt;
      if (this.deadT > 0.5) {
        this.phys.body.vy = Math.min(this.phys.body.vy + 900 * dt, 400);
        this.phys.body.y += this.phys.body.vy * dt;
      }
      return null;
    }
    if (this.mode === 'transform') {
      this.transformT -= dt;
      if (this.transformT <= 0) this.mode = 'play';
      return null;
    }
    if (this.mode !== 'play') return null;
    const res = stepPlayer(this.phys, input, dt, this.scene.grid, {
      minX,
      maxX,
      platforms: this.scene.platformBodies,
    });
    this.lastStep = res;
    if (res.jumped) sfx(this.power > 0 ? 'jumpBig' : 'jump');
    if (this.phys.onGround) this.combo = 0;
    if (res.landed && Math.abs(this.phys.body.vx) > 20) this.scene.dust(this.cx, this.bottom, 1);
    if (this.phys.skidding) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.06;
        this.scene.dust(this.cx + this.phys.facing * 4, this.bottom, 1);
      }
      this.skidSoundT -= dt;
      if (this.skidSoundT <= 0) {
        sfx('skid');
        this.skidSoundT = 0.15;
      }
    }
    return res;
  }

  bounce(jumpHeld: boolean): void {
    stompBounce(this.phys, jumpHeld);
  }

  /** Power-up einsammeln: 0→1 (Taco), →2 (Chili). */
  powerUp(to: 1 | 2): void {
    if (Run.power >= to) return;
    const from = Run.power;
    Run.power = to;
    if (from === 0) setBig(this.phys, true, this.scene.grid);
    this.startTransform(from, to);
  }

  /** Treffer: eine Stufe zurück. Liefert true, wenn Jamal stirbt. */
  hurt(): boolean {
    if (!this.canBeHurt) return false;
    if (Run.power === 0) return true;
    const from = Run.power;
    Run.power = from === 2 ? 1 : 0;
    if (Run.power === 0) setBig(this.phys, false, this.scene.grid);
    this.invulnT = 2;
    sfx('hurt');
    this.startTransform(from, Run.power);
    return false;
  }

  private startTransform(from: number, to: number): void {
    this.mode = 'transform';
    this.transformT = 0.6;
    this.transformFrom = from;
    this.transformTo = to;
  }

  die(): void {
    this.mode = 'dead';
    this.deadT = 0;
    this.phys.body.vx = 0;
    this.phys.body.vy = -330;
    this.starT = 0;
    this.sprite.clearTint();
    this.sprite.setDepth(60);
  }

  /** Grafik synchronisieren (pro Frame). */
  render(dt: number): void {
    const p = this.phys;
    const b = p.body;
    this.animT += dt;
    let key = this.texKey();
    let frame: number = F.idle;
    if (this.mode === 'dead') {
      frame = F.dead;
    } else if (this.mode === 'transform') {
      const flick = Math.floor(this.transformT * 20) % 2 === 0;
      key = this.texKey((flick ? this.transformTo : this.transformFrom) as 0 | 1 | 2);
      frame = F.idle;
      if (this.transformTo < this.transformFrom) frame = F.hurt;
    } else if (this.mode === 'goal') {
      frame = this.scene.goalPhase === 'slide' ? F.slide : this.scene.goalPhase === 'walk' ? runFrame(this.animT, 10) : F.win;
    } else if (p.ducking) {
      frame = F.duck;
    } else if (this.throwT > 0) {
      frame = F.throw;
    } else if (!p.onGround) {
      frame = b.vy < 0 ? F.jump : F.fall;
    } else if (p.skidding) {
      frame = F.skid;
    } else if (Math.abs(b.vx) > 4) {
      const speed = Math.abs(b.vx);
      const fps = 6 + (speed / PHYS.RUN_MAX) * 14;
      frame = runFrame(this.animT, fps);
    } else {
      this.blinkT -= dt;
      if (this.blinkT < 0) this.blinkT = 2.5 + Math.random() * 2;
      frame = this.blinkT < 0.12 ? F.idle2 : F.idle;
    }
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key, frame);
    else if (this.frame !== frame) this.sprite.setFrame(frame);
    this.frame = frame;
    this.sprite.setFlipX(p.facing < 0 && this.mode !== 'dead');
    // Pixelgenau runden
    this.sprite.setPosition(Math.round(b.x + b.w / 2), Math.round(b.y + b.h));
    // Unverwundbarkeit: Blinken
    if (this.invulnT > 0 && this.mode === 'play') this.sprite.setAlpha(Math.floor(this.invulnT * 30) % 2 ? 0.25 : 1);
    else this.sprite.setAlpha(1);
    if (this.starT > 0) {
      const c = STAR_COLORS[Math.floor(this.animT * 20) % STAR_COLORS.length];
      this.sprite.setTint(c);
    } else this.sprite.clearTint();
  }
}

function runFrame(t: number, fps: number): number {
  const seq = [F.run0, F.run1, F.run2, F.run1];
  return seq[Math.floor(t * fps) % seq.length];
}
