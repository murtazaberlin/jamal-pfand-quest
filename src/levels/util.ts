/** Fügt Level-Abschnitte (gleiche Zeilenanzahl) horizontal zusammen. */
export function join(...segments: string[][]): string[] {
  const h = segments[0].length;
  for (const s of segments) {
    if (s.length !== h) throw new Error(`Abschnitt hat ${s.length} statt ${h} Zeilen`);
  }
  const rows: string[] = [];
  for (let y = 0; y < h; y++) rows.push(segments.map((s) => s[y]).join(''));
  return rows;
}

/** Standard-Bossarena (24x14), Varianten unterscheiden sich in den Plattformen. */
export function arena(variant: number): string[] {
  const plats = [
    ['H...====........====...H', 'H......................H'],
    ['H..===....====....===..H', 'H......................H'],
    ['H......................H', 'H..=====........=====..H'],
    ['H....===..........===..H', 'H..........==..........H'],
  ][variant];
  return [
    'H......................H',
    'H......................H',
    'H......................H',
    'H......................H',
    'H......................H',
    'H......................H',
    plats[0],
    'H..........?*?.........H',
    plats[1],
    'H......................H',
    'H......................H',
    'H..@..............Q....H',
    'XXXXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXXXXXX',
  ];
}

/** Bonusraum-Vorlage mit Flaschenreihen und Ausgangs-Brunnen. */
export function bonusRoom(pattern: number): string[] {
  const top = ['H..BBBBBBBBBBBBBBBB....H', 'H...BBB..BBBB..BBB.....H'][pattern % 2];
  return [
    'HHHHHHHHHHHHHHHHHHHHHHHH',
    'H@.....................H',
    'H......................H',
    top,
    'H......................H',
    'H..BBBBBBBBBBBBBBBB....H',
    'H......................H',
    'H......................H',
    'H....HHHHHHHHHHHH......H',
    'H......................H',
    'H.BBBBBBBBBBBBBBBB.[]..H',
    'H..................{}..H',
    'HXXXXXXXXXXXXXXXXXXXXXXH',
    'HXXXXXXXXXXXXXXXXXXXXXXH',
  ];
}
