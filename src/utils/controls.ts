import { Action, loadSave } from './storage';

/**
 * Vereinheitlichte Eingabe: Tastatur (neu belegbar), Gamepad API, Touch.
 * `update()` einmal pro Frame aufrufen; danach liefern `down()`/`pressed()` Zustände.
 */
class ControlsImpl {
  private keys = new Set<string>();
  private touch = new Set<Action>();
  private cur = new Set<Action>();
  private prev = new Set<Action>();
  private anyKeyListeners: Array<(code: string) => void> = [];
  private started = false;
  gamepadConnected = false;
  lastDevice: 'keyboard' | 'gamepad' | 'touch' = 'keyboard';
  private pendingPress = new Set<Action>();

  init(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener('keydown', (e) => {
      if (this.anyKeyListeners.length > 0) {
        e.preventDefault();
        const l = this.anyKeyListeners.shift();
        l?.(e.code);
        return;
      }
      if (isGameKey(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) {
        // Tastendruck merken, auch wenn er vor dem nächsten Frame wieder losgelassen wird
        for (const a of this.actionsForKey(e.code)) this.pendingPress.add(a);
        this.pendingKeys.add(e.code);
      }
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touch.clear();
    });
    window.addEventListener('gamepadconnected', () => {
      this.gamepadConnected = true;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = this.readPads().length > 0;
    });
  }

  private actionsForKey(code: string): Action[] {
    const b = loadSave().settings.bindings;
    return (Object.keys(b) as Action[]).filter((a) => b[a].includes(code));
  }

  private readPads(): Gamepad[] {
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      return Array.from(pads).filter((p): p is Gamepad => !!p && p.connected);
    } catch {
      return [];
    }
  }

  update(): void {
    this.prev = this.cur;
    const next = new Set<Action>();
    const b = loadSave().settings.bindings;
    for (const a of Object.keys(b) as Action[]) {
      if (b[a].some((k) => this.keys.has(k))) next.add(a);
    }
    for (const a of this.touch) next.add(a);
    const pads = this.readPads();
    if (pads.length) this.gamepadConnected = true;
    for (const p of pads) {
      const btn = (i: number) => !!p.buttons[i]?.pressed;
      const ax = p.axes[0] ?? 0;
      const ay = p.axes[1] ?? 0;
      const before = next.size;
      if (btn(14) || ax < -0.4) next.add('left');
      if (btn(15) || ax > 0.4) next.add('right');
      if (btn(12) || ay < -0.5) next.add('up');
      if (btn(13) || ay > 0.5) next.add('down');
      if (btn(0) || btn(1)) next.add('jump');
      if (btn(2) || btn(3) || btn(6) || btn(7)) next.add('action');
      if (btn(9) || btn(8)) next.add('pause');
      if (next.size > before) this.lastDevice = 'gamepad';
    }
    for (const a of this.pendingPress) next.add(a);
    this.cur = next;
    this.keyEdges.clear();
    for (const k of this.keys) if (!this.keyPrev.has(k)) this.keyEdges.add(k);
    for (const k of this.pendingKeys) this.keyEdges.add(k);
    this.pendingKeys.clear();
    this.keyPrev = new Set(this.keys);
    // gemerkte Drücke einmal als "gedrückt" werten, danach verwerfen
    const pending = this.pendingPress;
    this.pendingPress = new Set();
    this.forcedPressed = pending;
  }

  private forcedPressed = new Set<Action>();

  down(a: Action): boolean {
    return this.cur.has(a);
  }

  pressed(a: Action): boolean {
    return (this.cur.has(a) && !this.prev.has(a)) || this.forcedPressed.has(a);
  }

  /** Menüs: Bestätigen = Sprung/Enter, Zurück = Escape. */
  confirm(): boolean {
    return this.pressed('jump') || this.keyPressedOnce('Enter') || this.keyPressedOnce('NumpadEnter');
  }

  private keyPrev = new Set<string>();
  private keyEdges = new Set<string>();

  private pendingKeys = new Set<string>();

  /** Für Rohtasten (Enter, Escape). */
  keyPressedOnce(code: string): boolean {
    return this.keyEdges.has(code);
  }

  setTouch(a: Action, on: boolean): void {
    if (on) {
      if (!this.touch.has(a)) this.pendingPress.add(a);
      this.touch.add(a);
      this.lastDevice = 'touch';
    } else this.touch.delete(a);
  }

  /** Nächste gedrückte Taste abfangen (für Tastenbelegung). */
  captureNextKey(cb: (code: string) => void): void {
    this.anyKeyListeners.push(cb);
  }

  cancelCapture(): void {
    this.anyKeyListeners = [];
  }

  isCapturing(): boolean {
    return this.anyKeyListeners.length > 0;
  }

  /** Simulierte Eingabe (für Tests/Demo). */
  simulate(code: string, on: boolean): void {
    if (on) {
      if (!this.keys.has(code)) for (const a of this.actionsForKey(code)) this.pendingPress.add(a);
      this.keys.add(code);
    } else this.keys.delete(code);
  }
}

function isGameKey(code: string): boolean {
  return code.startsWith('Arrow') || code === 'Space' || code === 'Tab';
}

export const Controls = new ControlsImpl();
