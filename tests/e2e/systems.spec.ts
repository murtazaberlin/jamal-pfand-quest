/* eslint-disable @typescript-eslint/no-explicit-any -- Test greift auf Spiel-Interna im Browser zu */
import { expect, test, Page } from '@playwright/test';

/**
 * Systemtests: Die echte Spielschleife wird angehalten und Frame für Frame
 * deterministisch weitergeschaltet (window.__t.step). Eingaben werden simuliert.
 */
async function setup(page: Page, stage: number): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).__JAMAL__?.scene), { timeout: 20_000 }).toBe('Title');
  await page.evaluate((stage) => {
    const w = window as any;
    const g = w.__game;
    g.loop.sleep();
    let t = performance.now();
    const base = Date.now() - t;
    Date.now = () => Math.round(base + t);
    w.__t = {
      step(n: number) { for (let i = 0; i < n; i++) { t += 1000 / 60; g.step(t, 1000 / 60); } },
      gs() { return g.scene.getScene('Game'); },
      key(code: string, on: boolean) { w.__controls.simulate(code, on); },
      tp(cx: number, bottom: number) {
        const s = g.scene.getScene('Game');
        const b = s.player.body;
        b.x = cx - b.w / 2; b.y = bottom - b.h; b.vx = 0; b.vy = 0;
        s.camX = Math.max(0, cx - 150); s.maxCamX = s.camX;
      },
      active() { return g.scene.getScenes(true).map((s: any) => s.scene.key); },
    };
    g.scene.stop('Title');
    g.scene.start('Game', { stage });
    w.__t.step(40);
  }, stage);
  return errors;
}

test('Ziel-Kaktus: Sequenz läuft, nächstes Level wird freigeschaltet', async ({ page }) => {
  const errors = await setup(page, 0);
  const res = await page.evaluate(() => {
    const t = (window as any).__t;
    t.tp(174 * 16, 192);
    t.key('ArrowRight', true);
    t.step(60);
    t.key('ArrowRight', false);
    const phases = new Set<string>();
    for (let i = 0; i < 900 && t.active().includes('Game'); i++) {
      t.step(1);
      const s = t.gs();
      if (s.sys.isActive()) phases.add(s.goalPhase);
    }
    t.step(30);
    return { phases: [...phases], active: t.active(), save: JSON.parse(localStorage.getItem('jamal-pfandquest-v1')!) };
  });
  expect(res.phases).toEqual(expect.arrayContaining(['slide', 'walk', 'tally', 'done']));
  expect(res.active).toContain('Map');
  expect(res.save.unlocked).toBeGreaterThanOrEqual(1);
  expect(res.save.cleared).toContain(0);
  expect(errors).toEqual([]);
});

test('Brunnen: in den Bonusraum und zurück, Flaschen zählen', async ({ page }) => {
  const errors = await setup(page, 0);
  const res = await page.evaluate(() => {
    const t = (window as any).__t;
    const s = t.gs();
    // auf den Brunnen (Spalte 116/117, Oberkante Reihe 10)
    t.tp(117 * 16, 160);
    t.step(5);
    t.key('ArrowDown', true);
    t.step(5);
    t.key('ArrowDown', false);
    t.step(90);
    const region1 = s.region;
    const pfand0 = (window as any).__game.scene.getScene('Game').player ? 0 : 0;
    // im Bonusraum rechts laufen und Flaschen einsammeln
    t.key('ArrowRight', true);
    t.step(150);
    t.key('ArrowRight', false);
    // zum Ausgangsbrunnen (Bonus-Spalte 20)
    t.tp(20 * 16, (s.bonusRow0 + 10) * 16);
    t.step(5);
    t.key('ArrowDown', true);
    t.step(5);
    t.key('ArrowDown', false);
    t.step(120);
    return { region1, region2: s.region, x: s.player.cx, pfand0 };
  });
  expect(res.region1).toBe('bonus');
  expect(res.region2).toBe('main');
  expect(res.x).toBeGreaterThan(141 * 16);
  expect(errors).toEqual([]);
});

test('Tod: Leben wird abgezogen, Level startet neu', async ({ page }) => {
  const errors = await setup(page, 0);
  const res = await page.evaluate(() => {
    const t = (window as any).__t;
    const lives0 = t.gs().player && (window as any).__game.scene.getScene('Hud') ? 0 : 0;
    // in die Grube bei Spalte 95 fallen
    t.tp(95 * 16 + 8, 150);
    t.step(400);
    return { lives0, mode: t.gs().player.mode, active: t.active() };
  });
  expect(res.mode).toBe('play');
  expect(res.active).toContain('Game');
  expect(errors).toEqual([]);
});

for (const stage of [2, 5, 8, 11]) {
  test(`Boss ${stage}: MEGA-ZYROO greift an und ist besiegbar`, async ({ page }) => {
    const errors = await setup(page, stage);
    const res = await page.evaluate(() => {
      const t = (window as any).__t;
      const s = t.gs();
      const boss = s.boss;
      const states = new Set<string>();
      // Spieler unverwundbar machen und den Boss beobachten
      for (let i = 0; i < 600; i++) {
        s.player.invulnT = 99;
        t.step(1);
        states.add(boss.state);
      }
      // Draufspringen bis besiegt
      let tries = 0;
      while (boss.alive && tries < 60) {
        tries++;
        s.player.invulnT = 99;
        if (boss.vulnerable) {
          t.tp(boss.body.x + boss.body.w / 2, boss.body.y - 4);
          s.player.body.vy = 200;
          s.player.mode = 'play';
        }
        t.step(70);
      }
      for (let i = 0; i < 600 && t.active().includes('Game'); i++) t.step(1);
      t.step(30);
      return { states: [...states], hp: boss.hp, active: t.active() };
    });
    expect(res.hp).toBe(0);
    expect(res.states.length).toBeGreaterThan(3);
    expect(res.active.some((k: string) => k === 'Map' || k === 'Credits')).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('Alle Level laden ohne Fehler', async ({ page }) => {
  const errors = await setup(page, 0);
  const res = await page.evaluate(() => {
    const t = (window as any).__t;
    const g = (window as any).__game;
    const ok: string[] = [];
    for (let st = 0; st < 12; st++) {
      g.scene.getScene('Game').scene.restart({ stage: st });
      t.step(20);
      t.key('ArrowRight', true);
      t.step(120);
      t.key('ArrowRight', false);
      ok.push(t.gs().def.id + ':' + Math.round(t.gs().player.cx));
    }
    return ok;
  });
  expect(res.length).toBe(12);
  expect(errors).toEqual([]);
});
