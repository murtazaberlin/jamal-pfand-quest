import { audio } from './engine';

export type SfxName =
  | 'jump' | 'jumpBig' | 'stomp' | 'bottle' | 'pinata' | 'bump' | 'brick' | 'powerup' | 'sprout'
  | 'hurt' | 'chili' | 'death' | 'oneup' | 'checkpoint' | 'goal' | 'kick' | 'bossHit' | 'bossRoar'
  | 'select' | 'move' | 'pause' | 'fireHit' | 'shock' | 'well' | 'tally' | 'whip' | 'throw' | 'skid'
  | 'firework' | 'star';

let lastPlay: Record<string, number> = {};

/** Spielt einen synthetisierten Soundeffekt. */
export function sfx(name: SfxName): void {
  const ctx = audio.ctx;
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // Spam-Schutz
  if (lastPlay[name] && now - lastPlay[name] < 0.03) return;
  lastPlay[name] = now;
  const o = audio.sfx;
  const t = now;
  switch (name) {
    case 'jump':
      audio.tone(o, 'square', 220, 660, 0.14, 0.12);
      break;
    case 'jumpBig':
      audio.tone(o, 'square', 160, 520, 0.18, 0.13);
      break;
    case 'stomp':
      audio.tone(o, 'square', 600, 120, 0.1, 0.18);
      audio.noise(o, 0.08, 0.2, 'lowpass', 900, t);
      break;
    case 'bottle': {
      // Glas-"Klink": zwei helle Töne
      audio.tone(o, 'sine', 1975, 1975, 0.18, 0.12, t);
      audio.tone(o, 'square', 2637, 2637, 0.12, 0.05, t + 0.05);
      audio.tone(o, 'sine', 3951, 3951, 0.1, 0.04, t + 0.05);
      break;
    }
    case 'pinata':
      audio.tone(o, 'square', 300, 200, 0.08, 0.15);
      for (let i = 0; i < 6; i++) audio.noise(o, 0.04, 0.08, 'highpass', 4000 + i * 500, t + i * 0.025);
      break;
    case 'bump':
      audio.tone(o, 'triangle', 180, 90, 0.08, 0.25);
      break;
    case 'brick':
      audio.noise(o, 0.25, 0.35, 'lowpass', 1800, t, 1, 300);
      audio.tone(o, 'square', 140, 60, 0.15, 0.12);
      break;
    case 'sprout':
      for (let i = 0; i < 6; i++) audio.tone(o, 'square', 300 + i * 90, 360 + i * 90, 0.05, 0.07, t + i * 0.045);
      break;
    case 'powerup':
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => audio.tone(o, 'square', f, f, 0.08, 0.09, t + i * 0.06));
      break;
    case 'star':
      [784, 988, 1175, 1568].forEach((f, i) => audio.tone(o, 'triangle', f, f * 1.01, 0.1, 0.12, t + i * 0.05));
      break;
    case 'hurt':
      audio.tone(o, 'square', 700, 120, 0.4, 0.14);
      audio.tone(o, 'sawtooth', 500, 90, 0.4, 0.06, t + 0.02);
      break;
    case 'chili':
      audio.noise(o, 0.12, 0.18, 'bandpass', 900, t, 2, 3000);
      audio.tone(o, 'square', 900, 300, 0.08, 0.06);
      break;
    case 'fireHit':
      audio.noise(o, 0.1, 0.2, 'lowpass', 2000, t);
      break;
    case 'death':
      [784, 740, 698, 659, 0, 523, 494, 392, 330, 262].forEach((f, i) => {
        if (f) audio.tone(o, 'square', f, f, 0.1, 0.11, t + 0.3 + i * 0.1);
      });
      audio.tone(o, 'square', 880, 220, 0.25, 0.12, t);
      break;
    case 'oneup': {
      // "Kassenbon-Ping": heller Glockenton + Bondrucker-Rattern + Jubel-Arpeggio
      audio.tone(o, 'sine', 2093, 2093, 0.6, 0.2, t);
      audio.tone(o, 'sine', 3136, 3136, 0.45, 0.08, t);
      audio.tone(o, 'sine', 4186, 4186, 0.3, 0.05, t);
      for (let i = 0; i < 10; i++) audio.noise(o, 0.025, 0.12, 'bandpass', 3500, t + 0.15 + i * 0.03, 3);
      [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => audio.tone(o, 'square', f, f, 0.09, 0.07, t + 0.5 + i * 0.07));
      break;
    }
    case 'checkpoint':
      [523, 659, 784, 1047].forEach((f, i) => audio.tone(o, 'triangle', f, f, 0.15, 0.18, t + i * 0.07));
      break;
    case 'goal':
      audio.tone(o, 'square', 300, 1400, 0.9, 0.1, t);
      break;
    case 'kick':
      audio.tone(o, 'square', 200, 500, 0.06, 0.15);
      audio.noise(o, 0.05, 0.2, 'highpass', 2000, t);
      break;
    case 'bossHit':
      audio.noise(o, 0.35, 0.4, 'lowpass', 2500, t, 1, 200);
      audio.tone(o, 'square', 300, 60, 0.35, 0.2);
      break;
    case 'bossRoar':
      audio.tone(o, 'sawtooth', 110, 70, 0.6, 0.18, t, 0.05);
      audio.tone(o, 'sawtooth', 116, 66, 0.6, 0.12, t, 0.05);
      audio.noise(o, 0.6, 0.15, 'lowpass', 600, t);
      break;
    case 'shock':
      audio.noise(o, 0.4, 0.4, 'lowpass', 400, t, 1, 80);
      audio.tone(o, 'sine', 80, 30, 0.4, 0.4);
      break;
    case 'whip':
      audio.noise(o, 0.15, 0.25, 'bandpass', 1200, t, 2, 6000);
      break;
    case 'throw':
      audio.tone(o, 'triangle', 400, 800, 0.1, 0.1);
      break;
    case 'select':
      audio.tone(o, 'square', 880, 880, 0.06, 0.1, t);
      audio.tone(o, 'square', 1320, 1320, 0.08, 0.1, t + 0.06);
      break;
    case 'move':
      audio.tone(o, 'square', 660, 660, 0.04, 0.06);
      break;
    case 'pause':
      [1319, 988, 1319, 988].forEach((f, i) => audio.tone(o, 'square', f, f, 0.05, 0.08, t + i * 0.06));
      break;
    case 'well':
      [400, 300, 200, 400, 300, 200].forEach((f, i) => audio.tone(o, 'square', f, f, 0.06, 0.1, t + i * 0.07));
      break;
    case 'tally':
      audio.tone(o, 'square', 1760, 1760, 0.03, 0.05);
      break;
    case 'skid':
      audio.noise(o, 0.1, 0.06, 'bandpass', 3000, t, 4);
      break;
    case 'firework':
      audio.noise(o, 0.5, 0.35, 'lowpass', 3000, t, 1, 150);
      break;
    default:
      break;
  }
}

export function resetSfxThrottle(): void {
  lastPlay = {};
}
