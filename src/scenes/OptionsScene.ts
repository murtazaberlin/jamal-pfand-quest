import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { Menu } from '../ui/menu';
import { PText, ptext } from '../ui/text';
import { Action, DEFAULT_BINDINGS, loadSave, resetProgress, updateSave } from '../utils/storage';
import { Controls } from '../utils/controls';
import { audio } from '../audio/engine';
import { sfx } from '../audio/sfx';
import { setCrt, toggleFullscreen } from '../ui/touch';

const ACTION_LABEL: Record<Action, string> = {
  left: 'LINKS', right: 'RECHTS', up: 'HOCH', down: 'RUNTER/DUCKEN',
  jump: 'SPRINGEN', action: 'SPRINT/CHILI', pause: 'PAUSE',
};

export function keyName(code: string): string {
  const map: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'LEER', Escape: 'ESC',
    ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT R', ControlLeft: 'STRG', ControlRight: 'STRG R', Enter: 'ENTER',
    AltLeft: 'ALT', Tab: 'TAB', Backspace: '←DEL',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM' + code.slice(6);
  return code.toUpperCase().slice(0, 6);
}

export class OptionsScene extends Phaser.Scene {
  private from = 'Title';
  private menu!: Menu;
  private keysMenu: Menu | null = null;
  private title!: PText;
  private hint!: PText;
  private resetArmed = false;

  constructor() {
    super('Options');
  }

  init(data: { from?: string }): void {
    this.from = data.from ?? 'Title';
    this.resetArmed = false;
    this.keysMenu = null;
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1b1022, 0.94).setOrigin(0, 0);
    this.title = ptext(this, GAME_W / 2, 18, 'OPTIONEN', { align: 'center', scale: 2, color: 0xf0c048 });
    this.hint = ptext(this, GAME_W / 2, GAME_H - 14, '← → ÄNDERN   SPRUNG/ENTER: WÄHLEN   ESC: ZURÜCK', { align: 'center', color: 0x9a8aa8 });
    const s = () => loadSave().settings;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const bar = (v: number) => '<' + '='.repeat(Math.round(v * 10)).padEnd(10, '.') + '>';
    const vol = (k: 'music' | 'sfx', d: number) => {
      updateSave((sv) => {
        sv.settings[k] = Math.round(Math.max(0, Math.min(1, sv.settings[k] + d)) * 10) / 10;
      });
      audio.setMusicVolume(s().music);
      audio.setSfxVolume(s().sfx);
      if (k === 'sfx') sfx('bottle');
    };
    this.menu = new Menu(this, [
      { label: () => `MUSIK   ${bar(s().music)} ${pct(s().music)}`, onLeft: () => vol('music', -0.1), onRight: () => vol('music', 0.1) },
      { label: () => `SOUNDS  ${bar(s().sfx)} ${pct(s().sfx)}`, onLeft: () => vol('sfx', -0.1), onRight: () => vol('sfx', 0.1) },
      { label: () => `VOLLBILD: ${document.fullscreenElement ? 'AN' : 'AUS'}`, onSelect: () => { void toggleFullscreen().then(() => this.menu.refresh()); } },
      {
        label: () => `CRT-FILTER: ${s().crt ? 'AN' : 'AUS'}`,
        onSelect: () => this.toggleCrt(), onLeft: () => this.toggleCrt(), onRight: () => this.toggleCrt(),
      },
      { label: () => 'STEUERUNG BELEGEN', onSelect: () => this.openKeys() },
      {
        label: () => (this.resetArmed ? 'WIRKLICH LÖSCHEN? (NOCHMAL)' : 'FORTSCHRITT LÖSCHEN'),
        onSelect: () => {
          if (!this.resetArmed) {
            this.resetArmed = true;
            return;
          }
          resetProgress();
          this.resetArmed = false;
          sfx('hurt');
        },
      },
      { label: () => 'ZURÜCK', onSelect: () => this.back() },
    ], GAME_W / 2, 52, 16);
  }

  private toggleCrt(): void {
    updateSave((sv) => (sv.settings.crt = !sv.settings.crt));
    setCrt(loadSave().settings.crt);
  }

  private openKeys(): void {
    this.menu.setVisible(false);
    this.title.setText('STEUERUNG');
    const actions = Object.keys(ACTION_LABEL) as Action[];
    const b = () => loadSave().settings.bindings;
    const items = actions.map((a) => ({
      label: () => `${ACTION_LABEL[a].padEnd(14, ' ')} ${b()[a].slice(0, 3).map(keyName).join(' / ')}`,
      onSelect: () => this.capture(a),
    }));
    items.push({ label: () => 'STANDARD WIEDERHERSTELLEN', onSelect: () => {
      updateSave((sv) => (sv.settings.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS))));
      this.keysMenu?.refresh();
    } });
    items.push({ label: () => 'ZURÜCK', onSelect: () => this.closeKeys() });
    this.keysMenu = new Menu(this, items, 40, 44, 14, false);
    this.hint.setText('GAMEPAD: AUTOMATISCH (A=SPRUNG, X=AKTION, START=PAUSE)');
  }

  private capture(a: Action): void {
    if (!this.keysMenu) return;
    this.keysMenu.active = false;
    this.hint.setText(`NEUE TASTE FÜR "${ACTION_LABEL[a]}" DRÜCKEN...`).setColor(0xffd23f);
    Controls.captureNextKey((code) => {
      if (code !== 'Escape' || a === 'pause') {
        updateSave((sv) => {
          const list = sv.settings.bindings[a].filter((k) => k !== code);
          sv.settings.bindings[a] = [code, ...list].slice(0, 4);
        });
      }
      this.hint.setText('BELEGT!').setColor(0x5ce65c);
      // Kurz warten, damit der Tastendruck nicht sofort das Menü auslöst
      this.time.delayedCall(200, () => {
        if (this.keysMenu) {
          this.keysMenu.active = true;
          this.keysMenu.refresh();
        }
      });
    });
  }

  private closeKeys(): void {
    this.keysMenu?.destroy();
    this.keysMenu = null;
    this.title.setText('OPTIONEN');
    this.hint.setText('← → ÄNDERN   SPRUNG/ENTER: WÄHLEN   ESC: ZURÜCK').setColor(0x9a8aa8);
    this.menu.setVisible(true);
    this.menu.refresh();
  }

  private back(): void {
    Controls.cancelCapture();
    this.scene.stop();
    this.scene.wake(this.from);
  }

  override update(_t: number, delta: number): void {
    const dt = delta / 1000;
    if (Controls.isCapturing()) return;
    if (Controls.keyPressedOnce('Escape') || Controls.keyPressedOnce('Backspace')) {
      if (this.keysMenu) this.closeKeys();
      else this.back();
      return;
    }
    if (this.keysMenu) this.keysMenu.update(dt);
    else this.menu.update(dt);
  }
}
