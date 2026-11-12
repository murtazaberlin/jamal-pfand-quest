import Phaser from 'phaser';
import { FIXED_DT, GAME_H, GAME_W, MAX_STEPS_PER_FRAME, TILE } from '../config';
import { Platform, rectOverlap } from '../physics/collision';
import { PlayerInput } from '../physics/player';
import { Player } from '../entities/Player';
import { Enemy, EnemyKind } from '../entities/Enemies';
import { Banana, BossShot, Fireball, Item, ItemKind } from '../entities/Items';
import { MovingPlatform } from '../entities/Platforms';
import { Boss } from '../entities/Boss';
import { LevelGrid, ParsedLevel, parseRows } from '../levels/loader';
import { LevelDef, TK } from '../levels/types';
import { STAGES, stageLabel } from '../levels';
import { T } from '../gfx/tiles';
import { CONFETTI_COLORS, THEMES } from '../gfx/palette';
import { Controls } from '../utils/controls';
import { Run } from '../state';
import { updateSave } from '../utils/storage';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { PText, ptext } from '../ui/text';
import { irisIn, irisOut } from '../ui/transition';
import { setTouchVisible } from '../ui/touch';
import { rng } from '../gfx/canvas';

interface BottleObj {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  taken: boolean;
}

export interface GameData {
  stage: number;
  checkpoint?: boolean;
}

const COMBO = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
const BONUS_GAP = 4;

export class GameScene extends Phaser.Scene {
  stage = 0;
  def!: LevelDef;
  main!: ParsedLevel;
  bonus: ParsedLevel | null = null;
  bonusRow0 = 0;
  grid!: LevelGrid;
  layer!: Phaser.Tilemaps.TilemapLayer;
  map!: Phaser.Tilemaps.Tilemap;
  player!: Player;
  enemies: Enemy[] = [];
  items: Item[] = [];
  fireballs: Fireball[] = [];
  bananas: Banana[] = [];
  shots: BossShot[] = [];
  platforms: MovingPlatform[] = [];
  platformBodies: Platform[] = [];
  bottles: BottleObj[] = [];
  boss: Boss | null = null;
  levelRight = 0;
  levelBottom = 0;
  region: 'main' | 'bonus' = 'main';
  goalPhase: 'none' | 'slide' | 'walk' | 'tally' | 'done' = 'none';
  timeLeft = 300;
  private timeAcc = 0;
  private acc = 0;
  private hitstop = 0;
  private camX = 0;
  private camY = 0;
  private lookAhead = 0;
  private maxCamX = 0;
  private bgLayers: Phaser.GameObjects.TileSprite[] = [];
  private pinataCells: Array<[number, number]> = [];
  private lavaCells: Array<[number, number]> = [];
  private animT = 0;
  private animFrame = 0;
  private checkpointSprite: Phaser.GameObjects.Sprite | null = null;
  private goalX = 0;
  private goalGroundY = 0;
  private goalFlag: Phaser.GameObjects.Image | null = null;
  private cantinaX = 0;
  private goalT = 0;
  private popups: PText[] = [];
  private popupIdx = 0;
  private dustEm!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confettiEm!: Phaser.GameObjects.Particles.ParticleEmitter;
  private glassEm!: Phaser.GameObjects.Particles.ParticleEmitter;
  private brickEm!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkEm!: Phaser.GameObjects.Particles.ParticleEmitter;
  private beardEm!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireEm!: Phaser.GameObjects.Particles.ParticleEmitter;
  private darkness: Phaser.GameObjects.Image | null = null;
  private deathT = -1;
  private ended = false;
  private hurryShown = false;
  private warpT = 0;

  constructor() {
    super('Game');
  }

  init(data: GameData): void {
    this.stage = data.stage ?? 0;
    Run.stage = this.stage;
    this.def = STAGES[this.stage];
    if (!data.checkpoint) Run.checkpoint = false;
  }

  create(): void {
    // Zustand zurücksetzen (Szene wird wiederverwendet)
    this.enemies = [];
    this.items = [];
    this.fireballs = [];
    this.bananas = [];
    this.shots = [];
    this.platforms = [];
    this.platformBodies = [];
    this.bottles = [];
    this.boss = null;
    this.region = 'main';
    this.goalPhase = 'none';
    this.acc = 0;
    this.hitstop = 0;
    this.pinataCells = [];
    this.lavaCells = [];
    this.popups = [];
    this.deathT = -1;
    this.ended = false;
    this.hurryShown = false;
    this.checkpointSprite = null;
    this.goalFlag = null;
    this.darkness = null;
    this.timeLeft = this.def.time;
    Run.time = this.timeLeft;
    Run.bossHp = 0;
    Run.bossMax = 0;

    const th = THEMES[this.def.world];
    this.cameras.main.setBackgroundColor(th.bgColor);

    this.buildWorld();
    this.buildBackground();
    this.buildTilemap();
    this.buildDecorations();
    this.buildParticles();
    this.spawnEntities();

    for (let i = 0; i < 2; i++) this.fireballs.push(new Fireball(this));
    for (let i = 0; i < 8; i++) {
      const t = ptext(this, 0, 0, '', { depth: 50 });
      t.setVisible(false);
      this.popups.push(t);
    }

    // Startposition (ggf. Checkpoint)
    let sx = this.main.start.tx * TILE + 8;
    let sy = (this.main.start.ty + 1) * TILE;
    if (Run.checkpoint && this.main.checkpoint) {
      sx = this.main.checkpoint.tx * TILE + 8;
      sy = (this.main.checkpoint.ty + 1) * TILE;
      (this.checkpointSprite as Phaser.GameObjects.Sprite | null)?.setFrame(1);
    }
    this.player = new Player(this, sx, sy);
    this.camX = Phaser.Math.Clamp(sx - GAME_W / 3, 0, this.levelRight - GAME_W);
    this.maxCamX = this.camX;
    this.lookAhead = 0;
    this.camY = this.levelBottom - GAME_H;
    this.applyCamera(true);

    if (this.def.dark) {
      this.darkness = this.add.image(0, 0, 'darkness').setDepth(40);
    }

    this.def.hint?.forEach((h) => {
      const [col, ...rest] = h.split(':');
      ptext(this, parseInt(col, 10) * TILE, 3 * TILE + 4, rest.join(':'), { align: 'center', color: 0xfff2a8, depth: 5 });
    });

    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');
    setTouchVisible(true);
    music.play(this.def.music);
    irisIn(this, Math.round(this.player.cx - this.cameras.main.scrollX), Math.round(this.player.bottom - 10 - this.cameras.main.scrollY));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('Hud');
    });
    // Debug-/Test-Hook
    (window as unknown as { __JAMAL__?: object }).__JAMAL__ = {
      scene: 'Game',
      stage: this.stage,
      get playerX() { return (window as unknown as { __game_player?: Player }).__game_player?.cx ?? 0; },
    };
    (window as unknown as { __game_player?: Player }).__game_player = this.player;
  }

  // ------------------------------------------------------------------
  // Aufbau
  // ------------------------------------------------------------------

  private buildWorld(): void {
    this.main = parseRows(this.def.rows);
    const mg = this.main.grid;
    let cols = mg.cols;
    let rows = mg.rows;
    this.bonus = null;
    if (this.def.bonus) {
      this.bonus = parseRows(this.def.bonus.rows);
      this.bonusRow0 = mg.rows + BONUS_GAP;
      cols = Math.max(cols, this.bonus.grid.cols);
      rows = this.bonusRow0 + this.bonus.grid.rows;
    }
    const g = new LevelGrid(cols, rows);
    const copy = (src: LevelGrid, row0: number) => {
      for (let ty = 0; ty < src.rows; ty++) for (let tx = 0; tx < src.cols; tx++) g.set(tx, ty + row0, src.get(tx, ty));
      for (const [i, c] of src.content) {
        const tx = i % src.cols, ty = Math.floor(i / src.cols);
        g.content.set(g.idx(tx, ty + row0), c);
        if (c === 'multi') g.multiLeft.set(g.idx(tx, ty + row0), src.multiLeft.get(i) ?? 8);
      }
    };
    copy(mg, 0);
    // Rand rechts füllen, falls Bonus breiter
    if (this.bonus) copy(this.bonus.grid, this.bonusRow0);
    this.grid = g;
    this.levelRight = mg.cols * TILE;
    this.levelBottom = mg.rows * TILE;
  }

  private tileIndex(tx: number, ty: number): number {
    const g = this.grid;
    const k = g.get(tx, ty);
    const mainRows = this.main.grid.rows;
    const isG = (x: number, y: number) => {
      if (x < 0 || x >= g.cols || y >= g.rows) return true;
      return g.get(x, y) === TK.Ground;
    };
    switch (k) {
      case TK.Ground: {
        let m = 0;
        if (ty > 0 && isG(tx, ty - 1)) m |= 1;
        if (isG(tx + 1, ty)) m |= 2;
        if (ty + 1 === mainRows || isG(tx, ty + 1)) m |= 4;
        if (isG(tx - 1, ty)) m |= 8;
        return T.GROUND + m;
      }
      case TK.Hard: return T.HARD;
      case TK.Brick: return T.BRICK;
      case TK.Pinata: return T.PINATA;
      case TK.Used: return T.USED;
      case TK.OneWay: {
        const l = g.get(tx - 1, ty) === TK.OneWay;
        const r = g.get(tx + 1, ty) === TK.OneWay;
        return !l && r ? T.ONEWAY_L : l && !r ? T.ONEWAY_R : T.ONEWAY_M;
      }
      case TK.WellTL: return T.WELL_TL;
      case TK.WellTR: return T.WELL_TR;
      case TK.WellBL: return T.WELL_BL;
      case TK.WellBR: return T.WELL_BR;
      case TK.Spikes: return T.SPIKES;
      case TK.Lava: return g.get(tx, ty - 1) === TK.Lava ? T.LAVA : T.LAVA_TOP;
      case TK.BackWall: return T.BACKWALL;
      case TK.Rail: return T.RAIL;
      case TK.Pillar: return T.PILLAR;
      default: return -1;
    }
  }

  private buildTilemap(): void {
    const g = this.grid;
    const data: number[][] = [];
    for (let ty = 0; ty < g.rows; ty++) {
      const row: number[] = [];
      for (let tx = 0; tx < g.cols; tx++) {
        const idx = this.tileIndex(tx, ty);
        row.push(idx);
        const k = g.get(tx, ty);
        if (k === TK.Pinata) this.pinataCells.push([tx, ty]);
        if (k === TK.Lava && g.get(tx, ty - 1) !== TK.Lava) this.lavaCells.push([tx, ty]);
      }
      data.push(row);
    }
    this.map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = this.map.addTilesetImage('ts', `tiles${this.def.world}`, TILE, TILE, 0, 0);
    if (!ts) throw new Error('Tileset fehlt');
    const layer = this.map.createLayer(0, ts, 0, 0);
    if (!layer) throw new Error('Layer fehlt');
    this.layer = layer.setDepth(0);
  }

  private buildBackground(): void {
    const w = this.def.world;
    this.bgLayers = [0, 1, 2].map((i) =>
      this.add.tileSprite(0, 0, GAME_W, GAME_H, `bg${w}-${i}`).setOrigin(0, 0).setScrollFactor(0).setDepth(-10 + i),
    );
  }

  private buildDecorations(): void {
    const g = this.main.grid;
    const r = rng(this.stage * 977 + 13);
    const avoid = [this.main.goal?.tx, this.main.checkpoint?.tx, this.main.start.tx].filter((x): x is number => x !== undefined);
    const w = this.def.world;
    for (let tx = 1; tx < g.cols - 1; tx++) {
      for (let ty = 1; ty < g.rows; ty++) {
        if (g.get(tx, ty) !== TK.Ground || g.get(tx, ty - 1) !== TK.Empty || g.get(tx, ty - 2) !== TK.Empty) continue;
        if (avoid.some((a) => Math.abs(a - tx) < 3)) continue;
        if (r() > 0.11) continue;
        const frame = Math.floor(r() * 4);
        const img = this.add.image(tx * TILE + 8, ty * TILE, `deco${w}`, frame).setOrigin(0.5, 1).setDepth(-2);
        if (r() < 0.5) img.setFlipX(true);
        if (w === 2 && frame === 0) {
          this.add.image(tx * TILE + 14, ty * TILE - 22, 'glow').setDepth(41).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8);
        }
        if (w === 3 && frame === 0) {
          this.add.image(tx * TILE + 8, ty * TILE - 24, 'glow').setDepth(-1).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5);
        }
        break;
      }
    }
  }

  private buildParticles(): void {
    this.dustEm = this.add.particles(0, 0, 'dust', {
      frame: [0, 1, 2], lifespan: 380, speed: { min: 6, max: 26 }, angle: { min: 200, max: 340 },
      alpha: { start: 0.9, end: 0 }, gravityY: -20, emitting: false,
    }).setDepth(19);
    this.confettiEm = this.add.particles(0, 0, 'chip', {
      lifespan: 1100, speed: { min: 60, max: 170 }, angle: { min: 215, max: 325 }, gravityY: 380,
      scaleX: { min: 0.4, max: 0.8 }, scaleY: { min: 0.6, max: 1 }, rotate: { min: 0, max: 360 },
      tint: CONFETTI_COLORS, emitting: false,
    }).setDepth(30);
    this.glassEm = this.add.particles(0, 0, 'chip', {
      lifespan: 500, speed: { min: 40, max: 110 }, angle: { min: 200, max: 340 }, gravityY: 500,
      scale: { min: 0.3, max: 0.7 }, tint: [0x8ee89a, 0x2f9e44, 0xd8955a, 0xc8f0ff, 0xffffff], emitting: false,
    }).setDepth(30);
    this.brickEm = this.add.particles(0, 0, 'brickchip', {
      lifespan: 900, speed: { min: 90, max: 190 }, angle: { min: 225, max: 315 }, gravityY: 900,
      rotate: { min: -360, max: 360 }, emitting: false,
    }).setDepth(30);
    this.sparkEm = this.add.particles(0, 0, 'spark', {
      lifespan: 320, speed: { min: 0, max: 30 }, scale: { start: 1, end: 0 }, emitting: false,
    }).setDepth(31);
    this.beardEm = this.add.particles(0, 0, 'chip', {
      lifespan: 1200, speed: { min: 40, max: 200 }, angle: { min: 0, max: 360 }, gravityY: 300,
      scaleX: { min: 0.3, max: 0.5 }, scaleY: { min: 1, max: 2 }, rotate: { min: 0, max: 360 },
      tint: [0xddd3bb, 0x9a9078, 0xffffff], emitting: false,
    }).setDepth(31);
    this.fireEm = this.add.particles(0, 0, 'dust', {
      frame: [0, 1], lifespan: 250, speed: { min: 10, max: 40 }, tint: [0xf86018, 0xffd040],
      alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(31);
  }

  private spawnEntities(): void {
    const w = this.def.world;
    const spawnFrom = (p: ParsedLevel, row0: number) => {
      for (const e of p.entities) {
        const ty = e.ty + row0;
        const kinds: Record<string, EnemyKind> = { g: 'walker', p: 'pot', f: 'flier', t: 'thrower', s: 'spiky' };
        if (kinds[e.type]) {
          this.enemies.push(new Enemy(this, kinds[e.type], e.tx, ty, e.range));
        } else if (e.type === 'B') {
          const x = e.tx * TILE + 8, y = ty * TILE + 8;
          const img = this.add.image(x, y, 'bottle', (e.tx * 7 + ty) % 3).setDepth(7);
          this.bottles.push({ sprite: img, x, y, taken: false });
        } else if (e.type === '-' || e.type === 'v' || e.type === '~' || e.type === 'c') {
          const kind = e.type === '-' ? 'h' : e.type === 'v' ? 'v' : e.type === '~' ? 'fall' : 'cart';
          const mp = new MovingPlatform(this, kind, e.tx, ty, e.range, w);
          this.platforms.push(mp);
          this.platformBodies.push(mp);
          if (kind === 'cart') {
            const g = this.add.graphics().setDepth(-1);
            const x0 = (e.tx - e.range) * TILE;
            const x1 = (e.tx + e.range) * TILE + 32;
            g.fillStyle(0x5a3a20).fillRect(x0, ty * TILE + 15, x1 - x0, 3);
            g.fillStyle(0xb8c0d0).fillRect(x0, ty * TILE + 14, x1 - x0, 1);
            for (let x = x0; x < x1; x += 8) g.fillStyle(0x3a2410).fillRect(x, ty * TILE + 15, 3, 4);
          }
        }
      }
    };
    spawnFrom(this.main, 0);
    if (this.bonus) spawnFrom(this.bonus, this.bonusRow0);

    const cp = this.main.checkpoint;
    if (cp) this.checkpointSprite = this.add.sprite(cp.tx * TILE + 8, (cp.ty + 1) * TILE, 'checkpoint', 0).setOrigin(0.5, 1).setDepth(6);
    const goal = this.main.goal;
    if (goal) {
      this.goalX = goal.tx * TILE;
      this.goalGroundY = (goal.ty + 1) * TILE;
      this.add.image(this.goalX + 8, this.goalGroundY, 'goal-cactus').setOrigin(0.5, 1).setDepth(5);
      this.goalFlag = this.add.image(this.goalX + 8 - 8, this.goalGroundY - 150, 'goal-flag').setOrigin(1, 0).setDepth(5);
      this.cantinaX = this.goalX + 6 * TILE;
      this.add.image(this.cantinaX, this.goalGroundY, 'cantina').setOrigin(0.5, 1).setDepth(4);
    }
    const b = this.main.boss;
    if (b && this.def.boss !== undefined) {
      this.boss = new Boss(this, this.def.boss, b.tx, b.ty);
    }
  }

  // ------------------------------------------------------------------
  // Hauptschleife (feste Schrittweite)
  // ------------------------------------------------------------------

  override update(_time: number, delta: number): void {
    if (Controls.pressed('pause') && this.player.mode !== 'dead' && this.goalPhase === 'none' && !this.ended) {
      this.openPause();
      return;
    }
    const dt = Math.min(delta / 1000, 0.1);
    this.acc += dt;
    // Eingabe einmal pro Frame lesen – Flanken nur im ersten Schritt
    const inp: PlayerInput = {
      left: Controls.down('left'),
      right: Controls.down('right'),
      up: Controls.down('up'),
      down: Controls.down('down'),
      jumpHeld: Controls.down('jump'),
      jumpPressed: Controls.pressed('jump'),
      run: Controls.down('action'),
    };
    const actionPressed = Controls.pressed('action');
    let steps = 0;
    let first = true;
    while (this.acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= FIXED_DT;
      steps++;
      const i = first ? inp : { ...inp, jumpPressed: false };
      this.fixedStep(i, first && actionPressed);
      first = false;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    if (first && inp.jumpPressed) {
      // Frame ohne Physikschritt: Sprung für den nächsten Schritt merken
      this.player.phys.bufferT = Math.max(this.player.phys.bufferT, 0.12);
    }
    this.renderAll(dt);
  }

  private fixedStep(inp: PlayerInput, actionPressed: boolean): void {
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    const dt = FIXED_DT;
    // Animierte Kacheln
    this.animT += dt;
    if (this.animT > 0.16) {
      this.animT = 0;
      this.animFrame = (this.animFrame + 1) % 6;
      const pf = [0, 1, 2, 1, 0, 0][this.animFrame];
      for (const [tx, ty] of this.pinataCells) if (this.grid.get(tx, ty) === TK.Pinata) this.layer.putTileAt(T.PINATA + pf, tx, ty);
      for (const [tx, ty] of this.lavaCells) this.layer.putTileAt(T.LAVA_TOP + (this.animFrame % 2), tx, ty);
    }

    for (const p of this.platforms) p.update();

    const pl = this.player;
    if (this.goalPhase !== 'none') {
      this.stepGoal(dt);
      return;
    }
    if (pl.mode === 'dead') {
      pl.step(inp, 0, 0);
      this.deathT += dt;
      if (this.deathT > 3) this.afterDeath();
      return;
    }
    if (pl.mode === 'warp') {
      this.stepWarp(dt);
      return;
    }
    if (this.boss && this.boss.state === 'dead') {
      // Arena geschafft – Spieler darf sich weiter bewegen
    }

    // ---- Spieler ----
    const b = pl.body;
    const prevBottom = b.y + b.h;
    const prevTop = b.y;
    const wasRising = b.vy < 0;
    const regionLeft = 0;
    const minX = this.def.noBackscroll && this.region === 'main' ? this.camX : regionLeft;
    const maxX = this.region === 'main' ? this.levelRight : this.bonus!.grid.cols * TILE;
    const res = pl.step(inp, minX, maxX);

    if (res && pl.mode === 'play') {
      // Plattform-Callback (Fallplattform)
      if (pl.phys.platform) pl.phys.platform.onStand?.();
      // Kopfstoß an Blöcken
      if (res.contacts.up && res.contacts.headTiles.length) {
        const cx = pl.cx;
        let best = res.contacts.headTiles[0];
        for (const t of res.contacts.headTiles) {
          if (Math.abs(t.tx * TILE + 8 - cx) < Math.abs(best.tx * TILE + 8 - cx)) best = t;
        }
        this.hitBlock(best.tx, best.ty, true);
      }
      // Unsichtbare Blöcke
      if (wasRising) this.checkHidden(prevTop);
      // Chili werfen
      if (actionPressed && Run.power === 2) this.throwFire();
      // Brunnen betreten
      if (inp.down && pl.phys.onGround) this.checkWell();
    }

    this.stepTime(dt);
    this.stepEnemies(prevBottom);
    for (const it of this.items) it.update();
    for (const f of this.fireballs) f.update();
    for (const bn of this.bananas) bn.update();
    for (const s of this.shots) s.update();
    if (this.boss) this.boss.update();
    this.interactions(prevBottom);
    this.items = this.items.filter((i) => !i.dead);
    this.bananas = this.bananas.filter((i) => !i.dead);
    this.shots = this.shots.filter((i) => !i.dead);

    // Gefahren
    if (pl.mode === 'play') this.checkHazards();
    // Checkpoint & Ziel
    if (pl.mode === 'play') this.checkCheckpointAndGoal();
  }

  private stepTime(dt: number): void {
    if (this.player.mode !== 'play' || this.boss?.state === 'dead') return;
    this.timeAcc += dt;
    if (this.timeAcc >= 1) {
      this.timeAcc -= 1;
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      Run.time = this.timeLeft;
      if (this.timeLeft === 100 && !this.hurryShown) {
        this.hurryShown = true;
        sfx('pause');
        this.banner('BEEILUNG!', 0xff8080);
      }
      if (this.timeLeft === 0) this.killPlayer();
    }
  }

  private stepEnemies(_prevBottom: number): void {
    const camL = this.cameras.main.scrollX;
    const camR = camL + GAME_W;
    for (const e of this.enemies) {
      // Gegner im Bonusraum/anderen Bereich nicht aktivieren
      const inRegion = this.region === 'main' ? e.body.y < this.levelBottom : e.body.y >= this.bonusRow0 * TILE;
      if (inRegion) e.activateIfVisible(camL, camR);
      e.update();
    }
    // Gegner untereinander: umdrehen, Topf räumt ab
    const act = this.enemies.filter((e) => e.active && e.alive);
    for (let i = 0; i < act.length; i++) {
      const a = act[i];
      for (let j = i + 1; j < act.length; j++) {
        const c = act[j];
        if (!rectOverlap(a.body.x, a.body.y, a.body.w, a.body.h, c.body.x, c.body.y, c.body.w, c.body.h)) continue;
        const aShell = a.state === 'shellMove';
        const cShell = c.state === 'shellMove';
        if (aShell || cShell) {
          if (aShell && cShell) {
            a.flip(-a.dir * 60);
            c.flip(-c.dir * 60);
            continue;
          }
          const shell = aShell ? a : c;
          const victim = aShell ? c : a;
          victim.flip(shell.dir * 60);
          sfx('stomp');
          this.awardCombo(victim.body.x + 6, victim.body.y, shell.potCombo++);
          continue;
        }
        if (a.kind === 'flier' || c.kind === 'flier' || a.kind === 'thrower' || c.kind === 'thrower') continue;
        if (a.state === 'walk' && c.state === 'walk' && a.dir !== c.dir) {
          a.dir = (-a.dir) as -1 | 1;
          c.dir = (-c.dir) as -1 | 1;
        }
      }
    }
  }

  private interactions(prevBottom: number): void {
    const pl = this.player;
    if (pl.mode !== 'play') return;
    const pb = pl.body;

    // ---- Gegner ----
    for (const e of this.enemies) {
      if (!e.active || !e.alive) continue;
      // Feuerbälle
      for (const f of this.fireballs) {
        if (f.dead || !e.overlaps(f.body)) continue;
        f.explode();
        e.flip(f.body.vx > 0 ? 40 : -40);
        sfx('fireHit');
        Run.addScore(200);
        this.scorePopup(e.body.x + 6, e.body.y, 200);
      }
      if (!e.alive || !e.overlaps(pb)) continue;
      if (pl.invincible) {
        e.flip(pl.phys.facing * 60);
        sfx('stomp');
        this.awardCombo(e.body.x + 6, e.body.y, pl.combo++);
        continue;
      }
      if (e.state === 'shell') {
        const stompish = pb.vy > 0 && prevBottom <= e.body.y + 6;
        e.kick(pl.cx);
        if (stompish) pl.bounce(Controls.down('jump'));
        Run.addScore(400);
        this.scorePopup(e.body.x + 6, e.body.y, 400);
        continue;
      }
      const stomp = pb.vy > 0 && prevBottom <= e.body.y + Math.max(6, pb.vy * FIXED_DT + 3);
      if (stomp) {
        const r = e.stomp();
        if (r === 'hurt') {
          this.hurtPlayer();
          pl.bounce(false);
          continue;
        }
        if (r === 'kick') e.kick(pl.cx);
        pl.bounce(Controls.down('jump'));
        sfx('stomp');
        this.hitStop(2);
        this.dust(e.body.x + 6, e.body.y + e.body.h, 3);
        if (e.kind === 'walker') this.beardEm.explode(4, e.body.x + 6, e.body.y + 10);
        this.awardCombo(e.body.x + 6, e.body.y, pl.combo++);
        continue;
      }
      if (e.state === 'shellMove' && e.kickGrace > 0) continue;
      if (e.harmful) this.hurtPlayer();
    }

    // ---- Bananen & Boss-Geschosse ----
    for (const bn of this.bananas) {
      if (bn.hits(pb)) {
        if (pl.invincible) { bn.kill(); continue; }
        this.hurtPlayer();
      }
    }
    for (const s of this.shots) {
      if (s.hits(pb)) {
        if (pl.invincible) continue;
        this.hurtPlayer();
      }
    }

    // ---- Boss ----
    const boss = this.boss;
    if (boss && boss.alive) {
      for (const f of this.fireballs) {
        if (!f.dead && boss.overlaps(f.body)) {
          f.explode();
          boss.fireHit();
          sfx('fireHit');
        }
      }
      if (boss.headHit(pb, pb.vy, prevBottom)) {
        boss.damage(1);
        pl.phys.body.vy = -420;
        pl.phys.jumping = Controls.down('jump');
        pl.phys.onGround = false;
        // vom Boss wegschieben
        pl.phys.body.vx = (pl.cx < boss.body.x + boss.body.w / 2 ? -1 : 1) * 120;
      } else if (boss.overlaps(pb)) {
        if (pl.invincible) {
          boss.damage(1);
        } else this.hurtPlayer();
      }
      const wb = boss.whipBox();
      if (wb && rectOverlap(wb.x, wb.y, wb.w, wb.h, pb.x, pb.y, pb.w, pb.h)) this.hurtPlayer();
    }

    // ---- Items ----
    for (const it of this.items) {
      if (it.dead || it.emergeT > 0) continue;
      const ib = it.body;
      if (!rectOverlap(ib.x, ib.y, ib.w, ib.h, pb.x, pb.y, pb.w, pb.h)) continue;
      this.collectItem(it.kind, ib.x + 6, ib.y);
      it.kill();
    }

    // ---- Flaschen ----
    const camL = this.cameras.main.scrollX - 16;
    const camR = camL + GAME_W + 32;
    for (const bo of this.bottles) {
      if (bo.taken || bo.x < camL || bo.x > camR) continue;
      if (rectOverlap(bo.x - 4, bo.y - 7, 8, 14, pb.x, pb.y, pb.w, pb.h)) {
        bo.taken = true;
        bo.sprite.destroy();
        this.addBottles(1, bo.x, bo.y);
      }
    }
  }

  private collectItem(kind: ItemKind, x: number, y: number): void {
    const pl = this.player;
    switch (kind) {
      case 'taco':
        if (Run.power === 0) {
          pl.powerUp(1);
          sfx('powerup');
        } else sfx('powerup');
        break;
      case 'chili':
        if (Run.power < 2) pl.powerUp(2);
        sfx('powerup');
        break;
      case 'star':
        pl.starT = 10;
        sfx('star');
        music.play('star');
        this.banner('GOLDENER KAKTUS!', 0xffd23f);
        break;
      case 'mask':
        this.oneUp(x, y);
        return;
    }
    Run.addScore(1000);
    this.scorePopup(x, y, 1000);
    this.sparkEm.explode(6, x, y + 6);
  }

  onStarEnd(): void {
    if (this.player.mode === 'play' && !this.ended) music.play(this.boss ? 'boss' : this.def.music);
  }

  // ------------------------------------------------------------------
  // Blöcke
  // ------------------------------------------------------------------

  hitBlock(tx: number, ty: number, byPlayer: boolean): void {
    const g = this.grid;
    const k = g.get(tx, ty);
    const idx = g.idx(tx, ty);
    const content = g.content.get(idx);
    if (k === TK.Pinata) {
      g.set(tx, ty, TK.Used);
      g.content.delete(idx);
      this.bumpTile(tx, ty, T.USED);
      this.confettiEm.explode(14, tx * TILE + 8, ty * TILE);
      sfx('pinata');
      this.spawnContent(content ?? 'bottle', tx, ty);
    } else if (k === TK.Brick) {
      if (content === 'multi') {
        const left = (g.multiLeft.get(idx) ?? 1) - 1;
        g.multiLeft.set(idx, left);
        this.spawnContent('bottle', tx, ty);
        if (left <= 0) {
          g.set(tx, ty, TK.Used);
          g.content.delete(idx);
          this.bumpTile(tx, ty, T.USED);
        } else this.bumpTile(tx, ty, T.BRICK);
      } else if (Run.power > 0 && byPlayer) {
        g.set(tx, ty, TK.Empty);
        this.layer.removeTileAt(tx, ty);
        this.brickEm.explode(6, tx * TILE + 8, ty * TILE + 8);
        sfx('brick');
        Run.addScore(50);
        this.shake(80, 0.003);
      } else {
        this.bumpTile(tx, ty, T.BRICK);
        sfx('bump');
      }
    } else {
      sfx('bump');
      return;
    }
    // Gegner/Items/Flaschen oberhalb des Blocks treffen
    const top = ty * TILE;
    const x0 = tx * TILE - 2, x1 = tx * TILE + TILE + 2;
    for (const e of this.enemies) {
      if (!e.active || !e.alive) continue;
      const eb = e.body;
      if (eb.x + eb.w > x0 && eb.x < x1 && Math.abs(eb.y + eb.h - top) < 4) {
        e.flip(eb.x + eb.w / 2 < tx * TILE + 8 ? -50 : 50);
        sfx('stomp');
        Run.addScore(100);
        this.scorePopup(eb.x + 6, eb.y, 100);
      }
    }
    for (const it of this.items) {
      const ib = it.body;
      if (ib.x + ib.w > x0 && ib.x < x1 && Math.abs(ib.y + ib.h - top) < 4) it.bump();
    }
    for (const bo of this.bottles) {
      if (!bo.taken && Math.abs(bo.x - (tx * TILE + 8)) < 10 && bo.y < top && bo.y > top - 20) {
        bo.taken = true;
        bo.sprite.destroy();
        this.addBottles(1, bo.x, bo.y);
      }
    }
  }

  hitBlockFromSide(tx: number, ty: number): void {
    const k = this.grid.get(tx, ty);
    if (k === TK.Pinata || k === TK.Brick) this.hitBlock(tx, ty, true);
  }

  private bumpTile(tx: number, ty: number, after: number): void {
    const world = this.def.world;
    const before = this.layer.getTileAt(tx, ty)?.index ?? after;
    this.layer.removeTileAt(tx, ty);
    const spr = this.add.image(tx * TILE + 8, ty * TILE + 8, `tiles${world}`, before >= 0 ? before : after).setDepth(1);
    this.tweens.add({
      targets: spr,
      y: spr.y - 5,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        spr.destroy();
        if (this.grid.get(tx, ty) !== TK.Empty) this.layer.putTileAt(this.tileIndex(tx, ty) >= 0 ? this.tileIndex(tx, ty) : after, tx, ty);
      },
    });
  }

  private spawnContent(c: string, tx: number, ty: number): void {
    switch (c) {
      case 'power':
        this.items.push(new Item(this, Run.power === 0 ? 'taco' : 'chili', tx, ty));
        sfx('sprout');
        break;
      case 'star':
        this.items.push(new Item(this, 'star', tx, ty));
        sfx('sprout');
        break;
      case 'mask':
        this.items.push(new Item(this, 'mask', tx, ty));
        sfx('sprout');
        break;
      default: {
        // Flasche springt aus dem Block
        const x = tx * TILE + 8;
        const y = ty * TILE;
        const spr = this.add.image(x, y, 'bottle', Math.floor(Math.random() * 3)).setDepth(9);
        this.tweens.add({
          targets: spr, y: y - 30, duration: 220, yoyo: true, ease: 'Quad.easeOut',
          onComplete: () => {
            this.glassEm.explode(5, x, y - 6);
            spr.destroy();
          },
        });
        this.addBottles(1, x, y - 12, true);
      }
    }
  }

  private checkHidden(prevTop: number): void {
    const b = this.player.body;
    const ty = Math.floor(b.y / TILE);
    const x0 = Math.floor((b.x + 2) / TILE), x1 = Math.floor((b.x + b.w - 2) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (this.grid.get(tx, ty) !== TK.Hidden) continue;
      if (prevTop < (ty + 1) * TILE - 2) continue;
      this.grid.set(tx, ty, TK.Pinata);
      this.grid.content.set(this.grid.idx(tx, ty), 'mask');
      this.layer.putTileAt(T.PINATA, tx, ty);
      b.y = (ty + 1) * TILE;
      b.vy = 0;
      this.player.phys.jumping = false;
      this.hitBlock(tx, ty, true);
      return;
    }
  }

  // ------------------------------------------------------------------
  // Pfand, Punkte, Leben
  // ------------------------------------------------------------------

  addBottles(n: number, x: number, y: number, quiet = false): void {
    const lives = Run.pfand.add(n);
    Run.addScore(50 * n);
    if (!quiet) this.sparkEm.explode(1, x, y);
    this.glassEm.explode(3, x, y);
    if (lives > 0) {
      Run.lives += lives;
      sfx('oneup');
      this.textPopup(x, y - 8, '1-UP! 25,00 €', 0x5ce65c);
    } else sfx('bottle');
  }

  private oneUp(x: number, y: number): void {
    Run.lives++;
    sfx('oneup');
    this.textPopup(x, y, '1-UP', 0x5ce65c);
  }

  private awardCombo(x: number, y: number, i: number): void {
    if (i >= COMBO.length) {
      this.oneUp(x, y);
      return;
    }
    Run.addScore(COMBO[i]);
    this.scorePopup(x, y, COMBO[i]);
  }

  scorePopup(x: number, y: number, pts: number): void {
    this.textPopup(x, y, String(pts), 0xffffff);
  }

  private textPopup(x: number, y: number, s: string, color: number): void {
    const t = this.popups[this.popupIdx++ % this.popups.length];
    this.tweens.killTweensOf(t);
    t.setText(s).setColor(color).setVisible(true).setAlpha(1).setPosition(Math.round(x), Math.round(y - 8));
    this.tweens.add({
      targets: t, y: t.y - 18, duration: 700, ease: 'Quad.easeOut',
      onComplete: () => t.setVisible(false),
    });
  }

  private banner(s: string, color: number): void {
    const t = ptext(this, GAME_W / 2, 60, s, { align: 'center', color, depth: 60, scroll: false, scale: 2 });
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 400, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------
  // Spieler: Schaden, Tod, Gefahren
  // ------------------------------------------------------------------

  hurtPlayer(): void {
    const pl = this.player;
    if (!pl.canBeHurt) return;
    const dies = pl.hurt();
    if (dies) this.killPlayer();
    else this.hitStop(4);
  }

  killPlayer(): void {
    const pl = this.player;
    if (pl.mode === 'dead') return;
    pl.die();
    Run.power = 0;
    this.deathT = 0;
    music.stop();
    sfx('death');
    this.hitStop(10);
  }

  private afterDeath(): void {
    if (this.ended) return;
    this.ended = true;
    Run.lives--;
    Run.persist();
    const toGameOver = Run.lives <= 0;
    irisOut(this, Math.round(GAME_W / 2), Math.round(GAME_H / 2), () => {
      if (toGameOver) this.scene.start('GameOver');
      else this.scene.restart({ stage: this.stage, checkpoint: Run.checkpoint });
    }, 500);
  }

  private checkHazards(): void {
    const pl = this.player;
    const b = pl.body;
    const bottom = this.region === 'main' ? this.levelBottom : this.grid.rows * TILE;
    if (b.y > bottom + 4) {
      this.killPlayer();
      return;
    }
    const x0 = Math.floor((b.x - 1) / TILE), x1 = Math.floor((b.x + b.w) / TILE);
    const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h + 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const k = this.grid.get(tx, ty);
        if (k === TK.Lava && b.y + b.h > ty * TILE + 5) {
          this.killPlayer();
          return;
        }
        if (k === TK.Spikes && !pl.invincible) {
          // Berührung von oben oder seitlich
          if (rectOverlap(b.x - 1, b.y, b.w + 2, b.h + 1, tx * TILE + 1, ty * TILE + 4, 14, 12)) this.hurtPlayer();
        }
      }
    }
  }

  private checkCheckpointAndGoal(): void {
    const pl = this.player;
    const cp = this.main.checkpoint;
    if (cp && !Run.checkpoint && this.region === 'main' && Math.abs(pl.cx - (cp.tx * TILE + 8)) < 10 && pl.bottom > cp.ty * TILE - 16) {
      Run.checkpoint = true;
      sfx('checkpoint');
      this.checkpointSprite?.setFrame(1);
      this.confettiEm.explode(16, cp.tx * TILE + 12, cp.ty * TILE - 10);
      this.textPopup(cp.tx * TILE + 8, cp.ty * TILE - 20, 'CHECKPOINT', 0x5ce65c);
    }
    if (this.main.goal && this.region === 'main' && pl.body.x + pl.body.w >= this.goalX + 4) this.startGoal();
  }

  // ------------------------------------------------------------------
  // Feuer, Bananen, Boss-Hilfen
  // ------------------------------------------------------------------

  private throwFire(): void {
    const f = this.fireballs.find((x) => x.dead);
    if (!f) return;
    const pl = this.player;
    f.fire(pl.cx + pl.phys.facing * 8, pl.body.y + 10, pl.phys.facing);
    pl.throwT = 0.15;
    sfx('chili');
  }

  throwBanana(x: number, y: number, tx: number, ty: number): void {
    const dx = tx - x;
    const vx = Phaser.Math.Clamp(dx * 0.9, -130, 130);
    const vy = -240 + Math.min(0, (ty - y) * 0.6);
    this.bananas.push(new Banana(this, x, y, vx, vy));
  }

  bananaDrop(x: number): void {
    const y = this.cameras.main.scrollY - 8;
    this.bananas.push(new Banana(this, x, y, 0, 40, true));
  }

  bossShot(kind: 'fire' | 'shock', x: number, y: number, vx: number, vy: number): void {
    this.shots.push(new BossShot(this, kind, x, y, vx, vy));
  }

  beardBurst(x: number, y: number): void {
    this.beardEm.explode(14, x, y);
    this.confettiEm.explode(6, x, y);
  }

  onBossDefeated(): void {
    music.play('clear');
    this.banner('MEGA-ZYROO BESIEGT!', 0xffd23f);
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(400 + i * 350, () => {
        const x = this.cameras.main.scrollX + 60 + Math.random() * 260;
        const y = 50 + Math.random() * 60;
        this.confettiEm.explode(30, x, y);
        sfx('firework');
      });
    }
    this.time.delayedCall(3800, () => this.finishStage());
  }

  shake(ms: number, intensity: number): void {
    this.cameras.main.shake(ms, intensity);
  }

  hitStop(frames: number): void {
    this.hitstop = Math.max(this.hitstop, frames);
  }

  dust(x: number, y: number, n: number): void {
    this.dustEm.explode(n, x, y - 2);
  }

  puff(x: number, y: number): void {
    this.fireEm.explode(4, x, y);
  }

  isOnScreen(x: number, margin = 0): boolean {
    const l = this.cameras.main.scrollX;
    return x > l - margin && x < l + GAME_W + margin;
  }

  // ------------------------------------------------------------------
  // Brunnen / Bonusraum
  // ------------------------------------------------------------------

  private warpTarget: { x: number; y: number; region: 'main' | 'bonus' } | null = null;

  private checkWell(): void {
    if (!this.bonus || !this.def.bonus) return;
    const pl = this.player;
    const b = pl.body;
    const tyBelow = Math.floor((b.y + b.h + 1) / TILE);
    const txC = Math.floor(pl.cx / TILE);
    const k = this.grid.get(txC, tyBelow);
    if (k !== TK.WellTL && k !== TK.WellTR) return;
    const inBonus = tyBelow >= this.bonusRow0;
    if (inBonus) {
      // zurück ins Hauptlevel an returnCol
      const col = this.def.bonus.returnCol;
      let row = 0;
      for (let ty = 0; ty < this.main.grid.rows; ty++) {
        const kk = this.grid.get(col, ty);
        if (kk === TK.WellTL || kk === TK.WellTR) { row = ty; break; }
        if (kk === TK.Ground || kk === TK.Hard) { row = ty; break; }
      }
      this.warpTarget = { x: col * TILE + 16, y: row * TILE, region: 'main' };
    } else {
      const s = this.bonus.start;
      this.warpTarget = { x: s.tx * TILE + 8, y: (s.ty + this.bonusRow0 + 1) * TILE, region: 'bonus' };
    }
    pl.mode = 'warp';
    this.warpT = 0;
    // Zentrieren auf den Brunnen
    const wellLeft = k === TK.WellTL ? txC : txC - 1;
    b.x = wellLeft * TILE + 16 - b.w / 2;
    b.vx = 0;
    b.vy = 0;
    pl.sprite.setDepth(-1);
    sfx('well');
  }

  private stepWarp(dt: number): void {
    const pl = this.player;
    this.warpT += dt;
    if (this.warpT < 0.7) {
      pl.body.y += 40 * dt;
      return;
    }
    if (this.warpTarget && this.warpT >= 0.7 && this.warpT - dt < 0.7) {
      const t = this.warpTarget;
      this.cameras.main.fadeOut(150, 0, 0, 0);
      this.time.delayedCall(160, () => {
        this.region = t.region;
        pl.body.x = t.x - pl.body.w / 2;
        pl.body.y = t.y - pl.body.h;
        pl.body.vx = 0;
        pl.body.vy = 0;
        pl.phys.onGround = true;
        this.camX = Phaser.Math.Clamp(t.x - GAME_W / 2, 0, this.regionRight() - GAME_W);
        this.maxCamX = this.camX;
        this.applyCamera(true);
        this.bgLayers.forEach((l) => l.setVisible(t.region === 'main'));
        if (t.region === 'bonus') {
          this.cameras.main.setBackgroundColor(0x120a18);
          music.play('bonus');
        } else {
          this.cameras.main.setBackgroundColor(THEMES[this.def.world].bgColor);
          music.play(this.player.starT > 0 ? 'star' : this.def.music);
          // aus dem Brunnen auftauchen
          pl.body.y = t.y - pl.body.h + 12;
          pl.body.vy = -260;
          pl.phys.onGround = false;
        }
        pl.sprite.setDepth(20);
        pl.mode = 'play';
        this.cameras.main.fadeIn(150, 0, 0, 0);
        this.warpTarget = null;
      });
    }
  }

  private regionRight(): number {
    return this.region === 'main' ? this.levelRight : this.bonus!.grid.cols * TILE;
  }

  // ------------------------------------------------------------------
  // Ziel-Sequenz
  // ------------------------------------------------------------------

  private startGoal(): void {
    const pl = this.player;
    this.goalPhase = 'slide';
    this.goalT = 0;
    pl.mode = 'goal';
    pl.starT = 0;
    const height = this.goalGroundY - pl.bottom;
    const pts = height > 120 ? 5000 : height > 90 ? 2000 : height > 60 ? 800 : height > 30 ? 400 : 100;
    Run.addScore(pts);
    this.scorePopup(this.goalX + 20, pl.body.y, pts);
    pl.body.x = this.goalX + 2 - pl.body.w;
    pl.body.vx = 0;
    pl.body.vy = 0;
    pl.phys.facing = 1;
    music.stop();
    sfx('goal');
    this.confettiEm.explode(20, this.goalX + 8, pl.body.y);
  }

  private stepGoal(dt: number): void {
    const pl = this.player;
    const b = pl.body;
    this.goalT += dt;
    switch (this.goalPhase) {
      case 'slide': {
        const ground = this.goalGroundY;
        if (b.y + b.h < ground) b.y = Math.min(ground - b.h, b.y + 110 * dt);
        if (this.goalFlag && this.goalFlag.y < ground - 20) this.goalFlag.y = Math.min(ground - 20, this.goalFlag.y + 110 * dt);
        if (b.y + b.h >= ground && this.goalT > 0.6) {
          this.goalPhase = 'walk';
          this.goalT = 0;
          b.x = this.goalX + 16;
          music.play('clear');
        }
        break;
      }
      case 'walk':
        if (this.goalT < 0.3) break;
        b.x += 60 * dt;
        b.vx = 60;
        pl.phys.onGround = true;
        if (b.x + b.w / 2 >= this.cantinaX) {
          pl.sprite.setVisible(false);
          this.goalPhase = 'tally';
          this.goalT = 0;
        }
        break;
      case 'tally':
        if (this.timeLeft > 0) {
          const n = Math.min(this.timeLeft, 2);
          this.timeLeft -= n;
          Run.time = this.timeLeft;
          Run.addScore(50 * n);
          if (Math.floor(this.goalT * 30) % 2 === 0) sfx('tally');
        } else {
          this.goalPhase = 'done';
          this.goalT = 0;
          // Feuerwerk über der Cantina
          for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 400, () => {
              this.confettiEm.explode(30, this.cantinaX + (i - 1) * 40, this.goalGroundY - 90 - i * 10);
              sfx('firework');
              Run.addScore(500);
            });
          }
        }
        break;
      case 'done':
        if (this.goalT > 2 && !this.ended) {
          this.ended = true;
          this.finishStage();
        }
        break;
    }
  }

  private finishStage(): void {
    this.ended = true;
    const stage = this.stage;
    updateSave((s) => {
      if (!s.cleared.includes(stage)) s.cleared.push(stage);
      s.unlocked = Math.max(s.unlocked, Math.min(STAGES.length - 1, stage + 1));
    });
    Run.checkpoint = false;
    Run.persist();
    const last = stage === STAGES.length - 1;
    irisOut(this, GAME_W / 2, GAME_H / 2, () => {
      if (last) this.scene.start('Credits', { won: true });
      else this.scene.start('Map', { justCleared: stage });
    });
  }

  // ------------------------------------------------------------------
  // Pause
  // ------------------------------------------------------------------

  private openPause(): void {
    sfx('pause');
    music.pause();
    this.scene.launch('Pause', { label: stageLabel(this.stage) });
    this.scene.pause();
  }

  // ------------------------------------------------------------------
  // Rendering & Kamera
  // ------------------------------------------------------------------

  private renderAll(dt: number): void {
    this.updateCamera(dt);
    this.player.render(dt);
    for (const e of this.enemies) e.render();
    for (const i of this.items) i.render();
    for (const f of this.fireballs) f.render();
    for (const b of this.bananas) b.render();
    for (const s of this.shots) s.render();
    for (const p of this.platforms) p.render();
    this.boss?.render();
    if (this.darkness) this.darkness.setPosition(Math.round(this.player.cx), Math.round(this.player.body.y + 8));
    if (this.player.starT > 0 && Math.random() < 0.3) {
      this.sparkEm.explode(1, this.player.cx + (Math.random() - 0.5) * 14, this.player.body.y + Math.random() * this.player.body.h);
    }
  }

  private updateCamera(_dt: number): void {
    const pl = this.player;
    if (pl.mode === 'dead' || this.goalPhase !== 'none') {
      this.applyCamera(false);
      return;
    }
    if (this.boss && this.region === 'main') {
      // Boss-Arena: feste Kamera
      this.camX = Phaser.Math.Clamp((this.levelRight - GAME_W) / 2, 0, Math.max(0, this.levelRight - GAME_W));
      this.applyCamera(false);
      return;
    }
    const moving = Math.abs(pl.body.vx) > 10;
    const target = pl.phys.facing * (moving ? 40 : 24);
    this.lookAhead += (target - this.lookAhead) * 0.035;
    const tx = pl.cx + this.lookAhead - GAME_W / 2;
    this.camX += (tx - this.camX) * 0.14;
    const right = this.regionRight();
    this.camX = Phaser.Math.Clamp(this.camX, 0, Math.max(0, right - GAME_W));
    if (this.def.noBackscroll && this.region === 'main') {
      this.camX = Math.max(this.camX, this.maxCamX);
      this.maxCamX = this.camX;
    }
    // vertikal
    const top = this.region === 'main' ? 0 : this.bonusRow0 * TILE;
    const bottom = this.region === 'main' ? this.levelBottom : this.grid.rows * TILE;
    const ty = pl.bottom - GAME_H * 0.62;
    this.camY += (ty - this.camY) * 0.1;
    this.camY = Phaser.Math.Clamp(this.camY, top, Math.max(top, bottom - GAME_H));
    this.applyCamera(false);
  }

  private applyCamera(snap: boolean): void {
    const cam = this.cameras.main;
    if (snap) {
      const top = this.region === 'main' ? 0 : this.bonusRow0 * TILE;
      const bottom = this.region === 'main' ? this.levelBottom : this.grid.rows * TILE;
      this.camY = Phaser.Math.Clamp(this.player ? this.player.bottom - GAME_H * 0.62 : bottom - GAME_H, top, Math.max(top, bottom - GAME_H));
    }
    cam.scrollX = Math.round(this.camX);
    cam.scrollY = Math.round(this.camY);
    const f = [0.06, 0.22, 0.5];
    this.bgLayers.forEach((l, i) => {
      l.tilePositionX = Math.round(this.camX * f[i]);
      l.tilePositionY = 0;
    });
  }
}
