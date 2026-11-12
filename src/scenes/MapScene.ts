import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { STAGES, WORLD_NAMES, stageLabel } from '../levels';
import { ptext, PText } from '../ui/text';
import { loadSave } from '../utils/storage';
import { Controls } from '../utils/controls';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Run } from '../state';
import { irisOut } from '../ui/transition';
import { setTouchVisible } from '../ui/touch';
import { JAMAL_FRAMES } from '../gfx/sprites';
import { OUT } from '../gfx/palette';

/** Knotenpositionen der Weltkarte (8 Level + 4 Bosse). */
export const MAP_NODES: Array<[number, number]> = [
  [34, 172], [70, 146], [110, 168],
  [148, 140], [186, 116], [222, 138],
  [258, 166], [296, 182], [334, 160],
  [340, 112], [300, 84], [338, 50],
];

const WORLD_COLORS = [0xe8b070, 0x5ab8a8, 0x4a3e58, 0xa84a30];

export class MapScene extends Phaser.Scene {
  private idx = 0;
  private jamal!: Phaser.GameObjects.Sprite;
  private info!: PText;
  private info2!: PText;
  private moving = false;
  private starting = false;
  private t = 0;
  private dots: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('Map');
  }

  init(data: { justCleared?: number }): void {
    const save = loadSave();
    this.idx = Math.min(save.unlocked, STAGES.length - 1);
    if (data.justCleared !== undefined && data.justCleared >= 0) this.idx = Math.min(save.unlocked, data.justCleared);
    this.moving = false;
    this.starting = false;
  }

  create(): void {
    setTouchVisible(false);
    this.cameras.main.setBackgroundColor(0x2a6ab0);
    const save = loadSave();
    const g = this.add.graphics();
    // Meer-Wellen
    for (let y = 0; y < GAME_H; y += 12) for (let x = (y / 12) % 2 ? 8 : 0; x < GAME_W; x += 24) g.fillStyle(0x3a80c8).fillRect(x, y, 8, 1);
    // Landmassen je Welt
    const blobs: Array<[number, number, number, number, number]> = [
      [10, 130, 130, 74, 0], [128, 96, 118, 68, 1], [232, 144, 140, 58, 2], [262, 30, 116, 108, 3],
    ];
    for (const [x, y, w, h, wi] of blobs) {
      g.fillStyle(OUT_N).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 14);
      g.fillStyle(WORLD_COLORS[wi]).fillRoundedRect(x, y, w, h, 12);
      g.fillStyle(0xffffff, 0.12).fillRoundedRect(x + 4, y + 3, w - 8, 6, 4);
    }
    // Deko-Symbole
    this.add.image(54, 186, 'deco0', 0).setScale(0.6);
    this.add.image(132, 150, 'deco0', 1).setScale(0.6);
    this.add.image(160, 112, 'deco1', 3).setScale(0.7);
    this.add.image(244, 186, 'deco2', 0).setScale(0.6);
    this.add.image(282, 64, 'deco3', 0).setScale(0.7);
    this.add.image(360, 84, 'deco3', 1).setScale(0.6);
    // Pfad
    for (let i = 0; i < MAP_NODES.length - 1; i++) {
      const [x0, y0] = MAP_NODES[i];
      const [x1, y1] = MAP_NODES[i + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
      for (let k = 1; k < n; k++) {
        const open = i + 1 <= save.unlocked;
        g.fillStyle(open ? 0xfff2a8 : 0x6a5a6a).fillRect(Math.round(x0 + ((x1 - x0) * k) / n) - 1, Math.round(y0 + ((y1 - y0) * k) / n) - 1, 2, 2);
      }
    }
    // Knoten
    this.dots = [];
    MAP_NODES.forEach(([x, y], i) => {
      const boss = STAGES[i].boss !== undefined;
      const cleared = save.cleared.includes(i);
      const locked = i > save.unlocked;
      const col = locked ? 0x5a5a6a : cleared ? 0x5ce65c : boss ? 0xff4f4f : 0xffd23f;
      g.fillStyle(OUT_N).fillCircle(x, y, boss ? 7 : 5);
      const dot = this.add.circle(x, y, boss ? 6 : 4, col);
      this.dots.push(dot);
      if (boss) this.add.image(x, y - 1, 'zyroo', 0).setScale(0.6).setAlpha(locked ? 0.4 : 1);
    });

    this.jamal = this.add.sprite(MAP_NODES[this.idx][0], MAP_NODES[this.idx][1] - 2, 'jamal-s', 0).setOrigin(0.5, 1).setDepth(10);

    // Infoleiste
    const bar = this.add.graphics();
    bar.fillStyle(0x1b1022, 0.85).fillRect(0, 0, GAME_W, 24);
    this.info = ptext(this, 8, 4, '');
    this.info2 = ptext(this, 8, 14, '', { color: 0xfff2a8 });
    ptext(this, GAME_W - 8, 4, `JAMAL ×${String(Run.lives).padStart(2, '0')}`, { align: 'right' });
    ptext(this, GAME_W - 8, 14, `PFAND ${Run.pfand.format()}`, { align: 'right', color: 0x5ce65c });
    const hint = ptext(this, GAME_W / 2, GAME_H - 10, '← → WÄHLEN   SPRUNG/ENTER: LOS   ESC: TITEL', { align: 'center', color: 0xffffff });
    hint.setAlpha(0.85);
    // Antippen eines Knotens
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const i = MAP_NODES.findIndex(([x, y]) => Math.hypot(p.x - x, p.y - y) < 14);
      if (i < 0) return;
      if (i === this.idx) this.startStage();
      else if (i <= loadSave().unlocked) this.walkTo(i);
    });
    this.updateInfo();
    music.play('map');
    this.cameras.main.fadeIn(300);
    (window as unknown as { __JAMAL__?: object }).__JAMAL__ = { scene: 'Map', node: this.idx };
  }

  private updateInfo(): void {
    const s = STAGES[this.idx];
    this.info.setText(`${stageLabel(this.idx)}  ${s.name}`);
    this.info2.setText(`WELT ${s.world + 1}: ${WORLD_NAMES[s.world]}`);
    (window as unknown as { __JAMAL__?: { node?: number } }).__JAMAL__!.node = this.idx;
  }

  private walkTo(target: number): void {
    if (this.moving || this.starting) return;
    const step = target > this.idx ? 1 : -1;
    const next = this.idx + step;
    this.moving = true;
    this.jamal.setFlipX(MAP_NODES[next][0] < MAP_NODES[this.idx][0]);
    sfx('move');
    this.tweens.add({
      targets: this.jamal,
      x: MAP_NODES[next][0],
      y: MAP_NODES[next][1] - 2,
      duration: 260,
      onComplete: () => {
        this.idx = next;
        this.moving = false;
        this.updateInfo();
        if (this.idx !== target) this.walkTo(target);
      },
    });
  }

  private startStage(): void {
    if (this.starting || this.moving) return;
    this.starting = true;
    sfx('select');
    music.stop(0.2);
    Run.checkpoint = false;
    irisOut(this, this.jamal.x, this.jamal.y - 8, () => {
      this.scene.start('Game', { stage: this.idx });
    });
  }

  override update(_t: number, delta: number): void {
    this.t += delta / 1000;
    if (this.starting) return;
    const unlocked = loadSave().unlocked;
    this.jamal.setFrame(this.moving ? [JAMAL_FRAMES.run0, JAMAL_FRAMES.run1, JAMAL_FRAMES.run2][Math.floor(this.t * 10) % 3] : JAMAL_FRAMES.idle);
    this.dots.forEach((d, i) => d.setScale(i === this.idx ? 1 + Math.sin(this.t * 6) * 0.15 : 1));
    if (!this.moving) {
      if ((Controls.pressed('right') || Controls.pressed('up')) && this.idx < unlocked && !Controls.down('jump')) this.walkTo(this.idx + 1);
      else if ((Controls.pressed('left') || Controls.pressed('down')) && this.idx > 0) this.walkTo(this.idx - 1);
      else if (Controls.keyPressedOnce('Enter') || Controls.keyPressedOnce('Space') ||
        (Controls.pressed('jump') && !Controls.keyPressedOnce('ArrowUp') && !Controls.keyPressedOnce('KeyW'))) this.startStage();
      else if (Controls.keyPressedOnce('Escape') || Controls.pressed('pause')) {
        this.starting = true;
        this.cameras.main.fadeOut(250);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
      }
    }
  }
}

const OUT_N = parseInt(OUT.slice(1), 16);
