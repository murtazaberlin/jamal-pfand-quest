// Hilfsskript: Screenshots für visuellen Review (node tests/shots.mjs <outDir> [stages...])
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? '.';
const stages = (process.argv[3] ?? '0,3,6,9,2,11').split(',').map(Number);
const xs = (process.argv[4] ?? '').split(',').filter(Boolean).map(Number);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.warn('PAGEERROR', e.message));
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__JAMAL__?.scene === 'Title', null, { timeout: 20000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/title.png` });
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  let t = performance.now();
  const base = Date.now() - t;
  Date.now = () => Math.round(base + t);
  window.__t = { step(n) { for (let i = 0; i < n; i++) { t += 1000 / 60; g.step(t, 1000 / 60); } } };
});
for (const [i, st] of stages.entries()) {
  await page.evaluate(({ st, x }) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.key !== 'Game' && s.scene.key !== 'Hud' && g.scene.stop(s.scene.key));
    if (g.scene.isActive('Game')) g.scene.getScene('Game').scene.restart({ stage: st });
    else g.scene.start('Game', { stage: st });
    window.__t.step(60);
    if (x) {
      const s = g.scene.getScene('Game');
      const b = s.player.body;
      b.x = x * 16; b.y = 0; s.camX = x * 16 - 150; s.maxCamX = s.camX;
      window.__t.step(90);
    }
  }, { st, x: xs[i] });
  await page.screenshot({ path: `${out}/stage${st}${xs[i] ? '_' + xs[i] : ''}.png` });
}
if (process.argv.includes('--map')) {
  await page.evaluate(() => { const g = window.__game; g.scene.stop('Game'); g.scene.stop('Hud'); g.scene.start('Map', {}); window.__t.step(60); });
  await page.screenshot({ path: `${out}/map.png` });
}
await browser.close();
