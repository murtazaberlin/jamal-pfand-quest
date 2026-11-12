/** Speichern in localStorage – immer mit try/catch (Privatmodus, gesperrter Speicher). */
const KEY = 'jamal-pfandquest-v1';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'action' | 'pause';

export const DEFAULT_BINDINGS: Record<Action, string[]> = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyW', 'ArrowUp', 'KeyK'],
  action: ['ShiftLeft', 'ShiftRight', 'KeyJ'],
  pause: ['Escape', 'KeyP'],
};

export interface Settings {
  music: number; // 0..1
  sfx: number;
  crt: boolean;
  bindings: Record<Action, string[]>;
}

export interface RunState {
  lives: number;
  score: number;
  bottles: number;
  power: 0 | 1 | 2; // klein, groß, feuer
}

export interface SaveData {
  unlocked: number; // höchster freigeschalteter Stage-Index
  cleared: number[]; // geschaffte Stages
  highscore: number;
  run: RunState | null;
  settings: Settings;
}

export function defaultSave(): SaveData {
  return {
    unlocked: 0,
    cleared: [],
    highscore: 0,
    run: null,
    settings: {
      music: 0.6,
      sfx: 0.8,
      crt: false,
      bindings: JSON.parse(JSON.stringify(DEFAULT_BINDINGS)),
    },
  };
}

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  const d = defaultSave();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      cache = {
        ...d,
        ...parsed,
        settings: {
          ...d.settings,
          ...(parsed.settings ?? {}),
          bindings: { ...d.settings.bindings, ...(parsed.settings?.bindings ?? {}) },
        },
      };
      return cache;
    }
  } catch {
    // Speicher nicht verfügbar – Standardwerte
  }
  cache = d;
  return cache;
}

export function writeSave(): void {
  if (!cache) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // ignorieren
  }
}

export function updateSave(fn: (s: SaveData) => void): void {
  const s = loadSave();
  fn(s);
  writeSave();
}

export function resetProgress(): void {
  updateSave((s) => {
    s.unlocked = 0;
    s.cleared = [];
    s.run = null;
  });
}
