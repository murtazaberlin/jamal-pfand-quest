/**
 * Eigene Chiptune-Kompositionen mit Mariachi-Flair (Trompeten-Lead in Terzen,
 * Gitarren-Strums, Guitarrón-Bass). Notation: siehe theory.parseLine.
 */
export type BassStyle = 'oompah' | 'waltz' | 'walk' | 'drive' | 'none';
export type StrumStyle = 'offbeat' | 'waltz' | 'arp' | 'none';

export interface SongDef {
  bpm: number;
  spb: number; // Schritte pro Schlag
  barSteps: number;
  key: string;
  minor: boolean;
  lead: string;
  chords: string[];
  bass: BassStyle;
  strum: StrumStyle;
  drums: string;
  harmony: boolean;
  loop: boolean;
  leadVol?: number;
}

export const SONGS: Record<string, SongDef> = {
  title: {
    bpm: 140, spb: 2, barSteps: 8, key: 'C', minor: false, harmony: true, loop: true,
    lead: `G4 C5 E5 G5 - - E5 G5 | A5 - G5 F5 E5 - D5 - | F4 B4 D5 F5 - - D5 F5 | G5 - F5 E5 D5 - - - |
           G4 C5 E5 G5 - - E5 G5 | C6 - B5 A5 G5 - E5 - | F5 - A5 - G5 - D5 - | C5 - - - . G4 A4 B4`,
    chords: ['C', 'C', 'G', 'G', 'C', 'F', 'G', 'C'],
    bass: 'oompah', strum: 'offbeat', drums: 'k h s h k h s h',
  },
  w0: {
    bpm: 150, spb: 2, barSteps: 6, key: 'G', minor: false, harmony: true, loop: true,
    lead: `B4 - D5 - G5 - | F#5 - E5 - D5 - | C5 - E5 - A5 - | F#5 - - - D5 - |
           D5 - F#5 - A5 - | C6 - B5 - A5 - | B5 - A5 - G5 - | D5 - - - - - |
           E5 - G5 - C6 - | B5 - A5 - G5 - | D5 - G5 - B5 - | A5 - G5 - F#5 - |
           E5 - F#5 - G5 - | A5 - B5 - C6 - | B5 - A5 - F#5 - | G5 - - - . . `,
    chords: ['G', 'D', 'Am', 'D', 'D', 'D7', 'G', 'G', 'C', 'C', 'G', 'G', 'C', 'D', 'D', 'G'],
    bass: 'waltz', strum: 'waltz', drums: 'k . h . s .',
  },
  w1: {
    bpm: 168, spb: 2, barSteps: 8, key: 'F', minor: false, harmony: true, loop: true,
    lead: `C5 F5 A5 F5 C6 - A5 - | Bb5 - G5 - E5 - C5 - | C5 E5 G5 E5 Bb5 - G5 - | A5 - F5 - C5 - - - |
           F5 F5 G5 A5 Bb5 - A5 G5 | A5 - F5 - C5 - F5 - | G5 - E5 - C5 D5 E5 G5 | F5 - - - F5 . . .`,
    chords: ['F', 'C', 'C', 'F', 'Bb', 'F', 'C', 'F'],
    bass: 'oompah', strum: 'offbeat', drums: 'k h s h k k s h',
  },
  w2: {
    bpm: 112, spb: 2, barSteps: 8, key: 'A', minor: true, harmony: true, loop: true, leadVol: 0.8,
    lead: `A4 - C5 - E5 - D5 C5 | B4 - - - G#4 - - - | A4 - C5 - E5 - A5 - | G5 - F5 - E5 - - - |
           F5 - E5 - D5 - C5 - | B4 - C5 - D5 - E5 - | C5 - B4 - A4 - G#4 - | A4 - - - . . . .`,
    chords: ['Am', 'E', 'Am', 'C', 'Dm', 'G', 'E', 'Am'],
    bass: 'walk', strum: 'arp', drums: 'k . . h k . s .',
  },
  w3: {
    bpm: 150, spb: 2, barSteps: 8, key: 'D', minor: true, harmony: true, loop: true,
    lead: `D5 - D5 F5 A5 - G5 F5 | E5 - C#5 - A4 - - - | D5 - F5 - A5 - D6 - | C6 - Bb5 - A5 - - - |
           Bb5 - A5 - G5 - F5 - | G5 - F5 - E5 - D5 - | E5 - F5 - G5 - E5 C#5 | D5 - - - . . . .`,
    chords: ['Dm', 'A', 'Dm', 'F', 'Gm', 'C', 'A', 'Dm'],
    bass: 'drive', strum: 'offbeat', drums: 'k h s h k k s s',
  },
  boss: {
    bpm: 176, spb: 2, barSteps: 8, key: 'E', minor: true, harmony: true, loop: true,
    lead: `E5 E5 G5 E5 B5 - A5 G5 | F#5 - D#5 - B4 - - - | E5 E5 G5 E5 C6 - B5 A5 | B5 - G5 - E5 - - - |
           C6 - B5 - A5 - G5 - | A5 - G5 - F#5 - E5 - | F#5 - G5 - A5 - B5 - | E5 - B4 - E5 - . .`,
    chords: ['Em', 'B', 'Em', 'Em', 'C', 'Am', 'B', 'Em'],
    bass: 'drive', strum: 'offbeat', drums: 'k s k s k s k s',
  },
  star: {
    bpm: 200, spb: 2, barSteps: 8, key: 'C', minor: false, harmony: true, loop: true,
    lead: 'C5 E5 G5 C6 G5 E5 C5 E5 | D5 F5 A5 D6 A5 F5 B4 D5',
    chords: ['C', 'G7'],
    bass: 'drive', strum: 'offbeat', drums: 'k h s h k h s h',
  },
  map: {
    bpm: 116, spb: 2, barSteps: 8, key: 'G', minor: false, harmony: true, loop: true,
    lead: 'D5 - G5 - B5 - A5 G5 | A5 - - - F#5 - D5 - | E5 - G5 - C6 - B5 A5 | G5 - - - . . . .',
    chords: ['G', 'D', 'C', 'G'],
    bass: 'oompah', strum: 'offbeat', drums: 'k . s . k . s .',
  },
  bonus: {
    bpm: 132, spb: 2, barSteps: 8, key: 'C', minor: false, harmony: false, loop: true, leadVol: 0.7,
    lead: 'C5 . E5 . G5 . E5 . | F5 . A5 . G5 . E5 . | D5 . F5 . A5 . F5 . | G5 . . B4 C5 . . .',
    chords: ['C', 'F', 'Dm', 'G'],
    bass: 'walk', strum: 'arp', drums: 'k h h h s h h h',
  },
  clear: {
    bpm: 150, spb: 2, barSteps: 8, key: 'C', minor: false, harmony: true, loop: false,
    lead: 'G4 C5 E5 G5 - E5 G5 - | C6 - - - - - - - | . . . . . . . .',
    chords: ['C', 'C', 'C'],
    bass: 'oompah', strum: 'offbeat', drums: 'k . s . k . s . | k . . . . . . . | . . . . . . . .',
  },
  gameover: {
    bpm: 90, spb: 2, barSteps: 8, key: 'A', minor: true, harmony: true, loop: false,
    lead: 'E5 - D5 - C5 - B4 - | A4 - G#4 - A4 - - - | . . . . . . . .',
    chords: ['Am', 'Am', 'Am'],
    bass: 'walk', strum: 'none', drums: '. . . . . . . . | . . . . . . . . | . . . . . . . .',
  },
  credits: {
    bpm: 120, spb: 2, barSteps: 8, key: 'C', minor: false, harmony: true, loop: true,
    lead: `G4 C5 E5 G5 - - E5 G5 | A5 - G5 F5 E5 - D5 - | F4 B4 D5 F5 - - D5 F5 | G5 - F5 E5 D5 - - - |
           G4 C5 E5 G5 - - E5 G5 | C6 - B5 A5 G5 - E5 - | F5 - A5 - G5 - D5 - | C5 - - - . . . .`,
    chords: ['C', 'C', 'G', 'G', 'C', 'F', 'G', 'C'],
    bass: 'waltz', strum: 'arp', drums: 'k . h . s . h .',
  },
};
