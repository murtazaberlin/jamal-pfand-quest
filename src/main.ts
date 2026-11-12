import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { MapScene } from './scenes/MapScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';
import { OptionsScene } from './scenes/OptionsScene';
import { GameOverScene } from './scenes/GameOverScene';
import { CreditsScene } from './scenes/CreditsScene';
import { GalleryScene } from './scenes/GalleryScene';
import { Controls } from './utils/controls';
import { loadSave } from './utils/storage';
import { audio } from './audio/engine';
import { music } from './audio/music';
import { setCrt, setupTouch } from './ui/touch';
import { Run } from './state';

Controls.init();
const settings = loadSave().settings;
setCrt(settings.crt);
setupTouch();
Run.loadFromSave();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#07040b',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  disableContextMenu: true,
  banner: false,
  input: { gamepad: false, keyboard: false, touch: true, mouse: true, activePointers: 4 },
  audio: { noAudio: true },
  fps: { target: 60, smoothStep: true },
  scale: { mode: Phaser.Scale.NONE, zoom: 1 },
  scene: [BootScene, TitleScene, MapScene, GameScene, HudScene, PauseScene, OptionsScene, GameOverScene, CreditsScene, GalleryScene],
});

// Eingabe einmal pro Frame vor allen Szenen auswerten
game.events.on(Phaser.Core.Events.PRE_STEP, () => Controls.update());

// Audio startet erst nach der ersten Interaktion
audio.armUnlock(() => {
  audio.setMusicVolume(loadSave().settings.music);
  audio.setSfxVolume(loadSave().settings.sfx);
  music.resumeAfterUnlock();
});

/**
 * Integer-Scaling in Geräte-Pixeln + Letterboxing.
 * Auf HiDPI-Displays (z. B. Smartphones) wird in physischen Pixeln ganzzahlig skaliert.
 */
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const devZoom = Math.max(1, Math.floor(Math.min((vw * dpr) / GAME_W, (vh * dpr) / GAME_H)));
  const zoom = devZoom / dpr;
  game.scale.setZoom(zoom);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('fullscreenchange', () => setTimeout(resize, 100));
game.events.once(Phaser.Core.Events.READY, resize);
resize();

// Tab im Hintergrund → Musik pausieren
document.addEventListener('visibilitychange', () => {
  if (!audio.ctx) return;
  if (document.hidden) void audio.ctx.suspend();
  else void audio.ctx.resume();
});

(window as unknown as { __game?: Phaser.Game }).__game = game;
(window as unknown as { __controls?: typeof Controls }).__controls = Controls;
