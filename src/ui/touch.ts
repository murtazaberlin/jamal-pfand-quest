import { Controls } from '../utils/controls';
import { Action } from '../utils/storage';

/** Virtuelles D-Pad + Sprung-/Aktionsbutton als DOM-Overlay (Multi-Touch). */
export function isTouchDevice(): boolean {
  try {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export function setupTouch(): void {
  const root = document.getElementById('touch');
  if (!root) return;
  if (!isTouchDevice()) {
    root.style.display = 'none';
    return;
  }
  root.style.display = 'block';
  document.body.classList.add('is-touch');

  // ---- D-Pad ----
  const pad = root.querySelector<HTMLElement>('.dpad')!;
  const active = new Map<number, Action[]>();
  const apply = () => {
    const all = new Set<Action>();
    for (const a of active.values()) a.forEach((x) => all.add(x));
    for (const a of ['left', 'right', 'up', 'down'] as Action[]) Controls.setTouch(a, all.has(a));
    pad.dataset.dir = [...all].join(' ');
  };
  const dirFrom = (e: PointerEvent): Action[] => {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dead = r.width * 0.12;
    const res: Action[] = [];
    if (Math.abs(dx) > dead && Math.abs(dx) > Math.abs(dy) * 0.5) res.push(dx < 0 ? 'left' : 'right');
    if (Math.abs(dy) > dead && Math.abs(dy) > Math.abs(dx) * 0.7) res.push(dy < 0 ? 'up' : 'down');
    return res;
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    active.set(e.pointerId, dirFrom(e));
    apply();
  });
  pad.addEventListener('pointermove', (e) => {
    if (!active.has(e.pointerId)) return;
    active.set(e.pointerId, dirFrom(e));
    apply();
  });
  const end = (e: PointerEvent) => {
    active.delete(e.pointerId);
    apply();
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  pad.addEventListener('lostpointercapture', end);

  // ---- Buttons ----
  root.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
    const action = btn.dataset.action as Action;
    const pointers = new Set<number>();
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      pointers.add(e.pointerId);
      Controls.setTouch(action, true);
      btn.classList.add('down');
    });
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        Controls.setTouch(action, false);
        btn.classList.remove('down');
      }
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  });
  root.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function setTouchVisible(gameplay: boolean): void {
  document.body.classList.toggle('touch-gameplay', gameplay);
}

export function setCrt(on: boolean): void {
  document.body.classList.toggle('crt', on);
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o?.lock?.('landscape').catch(() => undefined);
    } else {
      await document.exitFullscreen?.();
    }
  } catch {
    // nicht unterstützt (z. B. iOS Safari)
  }
}
