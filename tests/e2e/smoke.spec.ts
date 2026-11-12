import { expect, test, Page } from '@playwright/test';

type W = Window & { __JAMAL__?: { scene?: string; playerX?: number } };

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function sceneIs(page: Page, name: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as W).__JAMAL__?.scene), { timeout: 20_000 }).toBe(name);
}

test('Spiel lädt, Titel → Weltkarte → Level 1-1, Jamal bewegt sich', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await sceneIs(page, 'Title');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await sceneIs(page, 'Map');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await sceneIs(page, 'Game');
  await page.waitForTimeout(800);
  const x0 = await page.evaluate(() => (window as W).__JAMAL__!.playerX!);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
  const x1 = await page.evaluate(() => (window as W).__JAMAL__!.playerX!);
  expect(x1).toBeGreaterThan(x0 + 40);
  // Springen
  await page.keyboard.down('Space');
  await page.waitForTimeout(150);
  await page.keyboard.up('Space');
  // Pause öffnen und schließen
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __game: { scene: { isActive(k: string): boolean } } }).__game.scene.isActive('Pause'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __game: { scene: { isActive(k: string): boolean } } }).__game.scene.isActive('Pause'))).toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
});
