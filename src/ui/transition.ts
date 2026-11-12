import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';

const MAX_R = Math.ceil(Math.hypot(GAME_W, GAME_H));

/** Iris-Wipe: Kreis schließt sich um (x,y) – Bildschirmkoordinaten. */
export function irisOut(scene: Phaser.Scene, x: number, y: number, done: () => void, duration = 600): void {
  const cam = scene.cameras.main;
  const g = scene.make.graphics({}, false);
  const mask = g.createGeometryMask();
  cam.setMask(mask, true);
  const state = { r: MAX_R };
  const draw = () => {
    g.clear();
    g.fillStyle(0xffffff);
    g.fillCircle(x, y, Math.max(0.01, state.r));
  };
  draw();
  scene.tweens.add({
    targets: state,
    r: 0,
    duration,
    ease: 'Sine.easeIn',
    onUpdate: draw,
    onComplete: () => {
      done();
    },
  });
}

/** Iris öffnet sich. */
export function irisIn(scene: Phaser.Scene, x: number, y: number, duration = 600): void {
  const cam = scene.cameras.main;
  const g = scene.make.graphics({}, false);
  const mask = g.createGeometryMask();
  cam.setMask(mask, true);
  const state = { r: 0 };
  const draw = () => {
    g.clear();
    g.fillStyle(0xffffff);
    g.fillCircle(x, y, Math.max(0.01, state.r));
  };
  draw();
  scene.tweens.add({
    targets: state,
    r: MAX_R,
    duration,
    ease: 'Sine.easeOut',
    onUpdate: draw,
    onComplete: () => {
      cam.clearMask(true);
      g.destroy();
    },
  });
}

/** Kurzer Schwarz-Fade für Menüs. */
export function fadeTo(scene: Phaser.Scene, key: string, data?: object, ms = 250): void {
  scene.cameras.main.fadeOut(ms, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
}
