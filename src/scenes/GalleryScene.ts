import Phaser from 'phaser';

/** Debug-Ansicht aller generierten Texturen (Aufruf mit ?gallery). */
export class GalleryScene extends Phaser.Scene {
  constructor() {
    super('Gallery');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x6a8aa8);
    const page = new URLSearchParams(location.search).get('gallery') ?? '0';
    const sets: Record<string, Array<[string, number, number]>> = {
      '0': [['jamal-s', 14, 1], ['jamal-b', 14, 1], ['jamal-f', 14, 1]],
      '1': [['zyroo', 5, 2], ['zyroo-pot', 6, 2], ['zyroo-fly', 3, 2], ['zyroo-spike', 2, 2], ['items', 4, 2], ['bottle', 3, 2], ['banana', 3, 2], ['fireball', 2, 2], ['bossfx', 4, 2]],
      '2': [['boss0', 6, 1], ['boss3', 6, 1]],
      '3': [['tiles0', 36, 1], ['tiles1', 36, 1], ['tiles2', 36, 1], ['tiles3', 36, 1], ['deco0', 4, 1], ['deco1', 4, 1], ['deco2', 4, 1], ['deco3', 4, 1]],
    };
    let y = 4;
    for (const [key, n, sc] of sets[page] ?? []) {
      let x = 4;
      let rowH = 0;
      for (let i = 0; i < n; i++) {
        const img = this.add.image(x, y, key, i).setOrigin(0, 0).setScale(sc);
        x += img.displayWidth + 2;
        rowH = Math.max(rowH, img.displayHeight);
        if (x > 370) { x = 4; y += rowH + 2; rowH = 0; }
      }
      y += rowH + 4;
    }
    if (page === '4') {
      this.add.image(0, 0, 'goal-cactus').setOrigin(0, 0);
      this.add.image(40, 0, 'checkpoint', 1).setOrigin(0, 0).setScale(2);
      this.add.image(80, 0, 'cantina').setOrigin(0, 0).setScale(2);
      this.add.image(220, 0, 'platform', 0).setOrigin(0, 0).setScale(2);
      this.add.image(220, 30, 'minecart').setOrigin(0, 0).setScale(2);
      this.add.image(220, 70, 'fallplat', 0).setOrigin(0, 0).setScale(2);
      this.add.image(300, 0, 'goal-flag').setOrigin(0, 0).setScale(2);
    }
  }
}
