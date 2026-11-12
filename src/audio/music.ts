import { audio } from './engine';
import { SONGS, SongDef } from './songs';
import { NoteEvent, chordNotes, midiToFreq, noteToMidi, parseChord, parseLine, thirdBelow } from './theory';

interface Track {
  events: Map<number, NoteEvent[]>;
  length: number;
  inst: 'lead' | 'harm' | 'bass' | 'strum' | 'drum';
}

interface Compiled {
  def: SongDef;
  tracks: Track[];
  drums: { hits: string[]; length: number };
  length: number;
}

const cache = new Map<string, Compiled>();

function indexEvents(events: NoteEvent[]): Map<number, NoteEvent[]> {
  const m = new Map<number, NoteEvent[]>();
  for (const e of events) {
    const l = m.get(e.step) ?? [];
    l.push(e);
    m.set(e.step, l);
  }
  return m;
}

export function compileSong(def: SongDef): Compiled {
  const lead = parseLine(def.lead);
  const keyRoot = noteToMidi(`${def.key}4`) % 12;
  const tracks: Track[] = [{ events: indexEvents(lead.events), length: lead.length, inst: 'lead' }];
  if (def.harmony) {
    const harm = lead.events.map((e) => ({ ...e, notes: e.notes.map((n) => thirdBelow(n, keyRoot, def.minor)) }));
    tracks.push({ events: indexEvents(harm), length: lead.length, inst: 'harm' });
  }
  const bass: NoteEvent[] = [];
  const strum: NoteEvent[] = [];
  const bs = def.barSteps;
  def.chords.forEach((name, bar) => {
    const ch = parseChord(name);
    const o = bar * bs;
    const [r, , f] = chordNotes(ch, 2);
    const third = chordNotes(ch, 2)[1];
    const tri = chordNotes(ch, 4);
    switch (def.bass) {
      case 'oompah':
        for (let i = 0; i < bs; i += 4) {
          bass.push({ step: o + i, notes: [r], len: 2 });
          if (i + 2 < bs) bass.push({ step: o + i + 2, notes: [f - 12], len: 2 });
        }
        break;
      case 'waltz':
        bass.push({ step: o, notes: [r], len: 2 });
        if (bs >= 6) bass.push({ step: o + 4, notes: [f - 12], len: 2 });
        else bass.push({ step: o + bs / 2, notes: [f - 12], len: 2 });
        break;
      case 'walk':
        bass.push({ step: o, notes: [r], len: 3 });
        bass.push({ step: o + Math.floor(bs / 2), notes: [f - 12], len: 2 });
        bass.push({ step: o + bs - 2, notes: [third], len: 2 });
        break;
      case 'drive':
        for (let i = 0; i < bs; i++) bass.push({ step: o + i, notes: [i >= bs - 2 ? f - 12 : r], len: 1 });
        break;
      default:
        break;
    }
    switch (def.strum) {
      case 'offbeat':
        for (let i = 1; i < bs; i += 2) strum.push({ step: o + i, notes: tri, len: 1 });
        break;
      case 'waltz':
        strum.push({ step: o + 2, notes: tri, len: 1 });
        strum.push({ step: o + 4, notes: tri, len: 1 });
        break;
      case 'arp':
        for (let i = 0; i < bs; i++) strum.push({ step: o + i, notes: [tri[[0, 1, 2, 1][i % 4]] + 12], len: 1 });
        break;
      default:
        break;
    }
  });
  const songLen = Math.max(lead.length, def.chords.length * bs);
  tracks.push({ events: indexEvents(bass), length: def.chords.length * bs, inst: 'bass' });
  if (strum.length) tracks.push({ events: indexEvents(strum), length: def.chords.length * bs, inst: 'strum' });
  const hits = def.drums.split(/\s+/).filter((t) => t && t !== '|');
  return { def, tracks, drums: { hits, length: hits.length }, length: songLen };
}

// ---------------- Instrumente ----------------

function trumpet(out: AudioNode, midi: number, t: number, dur: number, vol: number, bright: number): void {
  const ctx = audio.ctx!;
  const f = midiToFreq(midi);
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 2;
  lp.frequency.setValueAtTime(700, t);
  lp.frequency.exponentialRampToValueAtTime(2600 * bright, t + 0.04);
  lp.frequency.exponentialRampToValueAtTime(1700 * bright, t + 0.18);
  const vib = ctx.createOscillator();
  const vibG = ctx.createGain();
  vib.frequency.value = 5.8;
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.25, dur));
  vib.connect(vibG);
  const oscs = [-6, 6].map((det) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03); // Ansatz-"Lippen"-Glide
    o.detune.value = det;
    vibG.connect(o.frequency);
    o.connect(lp);
    return o;
  });
  const end = t + dur;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(vol * 0.65, t + 0.12);
  g.gain.setValueAtTime(vol * 0.65, Math.max(t + 0.12, end - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, end + 0.04);
  lp.connect(g).connect(out);
  for (const o of oscs) {
    o.start(t);
    o.stop(end + 0.06);
  }
  vib.start(t);
  vib.stop(end + 0.06);
}

function pluck(out: AudioNode, midi: number, t: number, vol: number, type: OscillatorType, decay: number): void {
  const ctx = audio.ctx!;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = midiToFreq(midi);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.02);
}

function drum(out: AudioNode, kind: string, t: number): void {
  const ctx = audio.ctx!;
  if (kind === 'k') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.2);
  } else if (kind === 's') {
    audio.noise(out, 0.12, 0.22, 'bandpass', 1800, t, 0.8);
    audio.tone(out, 'triangle', 220, 160, 0.06, 0.12, t);
  } else if (kind === 'h') {
    audio.noise(out, 0.035, 0.08, 'highpass', 7000, t);
  }
}

// ---------------- Player ----------------

export class MusicPlayer {
  private song: Compiled | null = null;
  private key = '';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private bus: GainNode | null = null;
  private onEnd: (() => void) | null = null;
  private pausedKey = '';

  get current(): string {
    return this.key;
  }

  play(key: string, onEnd?: () => void, force = false): void {
    if (!force && key === this.key && this.timer !== null) return;
    this.stop();
    this.key = key;
    this.onEnd = onEnd ?? null;
    const def = SONGS[key];
    if (!def) return;
    let c = cache.get(key);
    if (!c) {
      c = compileSong(def);
      cache.set(key, c);
    }
    this.song = c;
    if (!audio.ctx) return; // startet nach Freischaltung über resumeAfterUnlock
    this.bus = audio.ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(audio.music);
    this.step = 0;
    this.nextTime = audio.now + 0.06;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  /** Nach Audio-Freischaltung den gewünschten Track starten. */
  resumeAfterUnlock(): void {
    if (this.key && this.timer === null) this.play(this.key, this.onEnd ?? undefined, true);
  }

  stop(fade = 0.05): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (this.bus && audio.ctx) {
      const b = this.bus;
      b.gain.setTargetAtTime(0, audio.now, fade);
      window.setTimeout(() => b.disconnect(), 600);
    }
    this.bus = null;
    this.key = '';
  }

  /** Musik kurz unterbrechen (z. B. Pause) */
  pause(): void {
    this.pausedKey = this.key;
    this.stop(0.02);
  }

  resume(): void {
    if (this.pausedKey) this.play(this.pausedKey, undefined, true);
    this.pausedKey = '';
  }

  private schedule(): void {
    const ctx = audio.ctx;
    const song = this.song;
    if (!ctx || !song || !this.bus) return;
    const def = song.def;
    const stepDur = 60 / def.bpm / def.spb;
    while (this.nextTime < ctx.currentTime + 0.15) {
      if (this.step >= song.length) {
        if (!def.loop) {
          const cb = this.onEnd;
          this.stop(0.3);
          cb?.();
          return;
        }
        this.step = 0;
      }
      const t = this.nextTime;
      for (const tr of song.tracks) {
        const evs = tr.events.get(this.step % tr.length);
        if (!evs) continue;
        for (const e of evs) {
          const dur = e.len * stepDur * 0.95;
          for (const [i, n] of e.notes.entries()) {
            switch (tr.inst) {
              case 'lead':
                trumpet(this.bus, n, t, dur, 0.09 * (def.leadVol ?? 1), 1);
                break;
              case 'harm':
                trumpet(this.bus, n, t, dur, 0.05 * (def.leadVol ?? 1), 0.8);
                break;
              case 'bass':
                pluck(this.bus, n, t, 0.28, 'triangle', Math.min(0.35, dur + 0.1));
                pluck(this.bus, n + 12, t, 0.04, 'square', 0.08);
                break;
              case 'strum':
                pluck(this.bus, n, t + i * 0.008, 0.035, 'square', 0.11);
                break;
              default:
                break;
            }
          }
        }
      }
      const hit = song.drums.hits[this.step % song.drums.length];
      if (hit && hit !== '.') drum(this.bus, hit, t);
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

export const music = new MusicPlayer();
