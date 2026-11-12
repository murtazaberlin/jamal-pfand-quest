/** Musiktheorie-Helfer (rein, testbar). */

const NOTE_IDX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" → MIDI 73; "Bb4" → 70 */
export function noteToMidi(n: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`Ungültige Note: ${n}`);
  let v = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  v += (parseInt(m[3], 10) + 1) * 12;
  return v;
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export interface Chord {
  root: number; // Pitch-Klasse 0..11
  minor: boolean;
  seventh: boolean;
}

export function parseChord(s: string): Chord {
  const m = /^([A-G])([#b]?)(m?)(7?)$/.exec(s);
  if (!m) throw new Error(`Ungültiger Akkord: ${s}`);
  const root = (NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return { root, minor: m[3] === 'm', seventh: m[4] === '7' };
}

/** Akkordtöne als MIDI ab einer Basisoktave. */
export function chordNotes(c: Chord, octave: number): number[] {
  const base = (octave + 1) * 12 + c.root;
  const n = [base, base + (c.minor ? 3 : 4), base + 7];
  if (c.seventh) n.push(base + 10);
  return n;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 11]; // harmonisch Moll

/** Diatonische Terz unterhalb (Mariachi-Trompeten-Satz). */
export function thirdBelow(midi: number, keyRoot: number, minor: boolean): number {
  const scale = (minor ? MINOR : MAJOR).map((d) => (d + keyRoot) % 12);
  // nächster Skalenton ≤ midi
  let idx = -1;
  let m = midi;
  for (let k = 0; k < 12 && idx < 0; k++) {
    idx = scale.indexOf(((m % 12) + 12) % 12);
    if (idx < 0) m--;
  }
  if (idx < 0) return midi - 4;
  const target = scale[(idx - 2 + 7) % 7];
  let r = m - 1;
  while (((r % 12) + 12) % 12 !== target) r--;
  return r;
}

export interface NoteEvent {
  step: number;
  notes: number[];
  len: number;
}

/** Parst eine Notenzeile: Tokens durch Leerzeichen, "-" hält, "." Pause, "|" ignoriert, "+" Akkord. */
export function parseLine(line: string): { events: NoteEvent[]; length: number } {
  const tokens = line.split(/\s+/).filter((t) => t && t !== '|');
  const events: NoteEvent[] = [];
  let cur: NoteEvent | null = null;
  tokens.forEach((tok, i) => {
    if (tok === '-') {
      if (cur) cur.len++;
      return;
    }
    cur = null;
    if (tok === '.') return;
    const notes = tok.split('+').map(noteToMidi);
    cur = { step: i, notes, len: 1 };
    events.push(cur);
  });
  return { events, length: tokens.length };
}
