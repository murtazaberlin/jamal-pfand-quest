/**
 * Web-Audio-Engine: getrennte Busse für Musik und SFX.
 * Der AudioContext wird erst nach der ersten Nutzerinteraktion erzeugt/fortgesetzt.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfx!: GainNode;
  noiseBuf!: AudioBuffer;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private unlockHandlers: Array<() => void> = [];

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Registriert Listener, die Audio bei der ersten Interaktion starten. */
  armUnlock(onReady: () => void): void {
    this.unlockHandlers.push(onReady);
    const unlock = () => {
      this.start();
      if (this.ctx && this.ctx.state !== 'running') {
        void this.ctx.resume().then(() => this.flushUnlock());
      } else this.flushUnlock();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'mousedown']) {
      window.addEventListener(ev, unlock, { once: false, passive: true });
    }
  }

  private flushUnlock(): void {
    const hs = this.unlockHandlers;
    this.unlockHandlers = [];
    hs.forEach((h) => h());
  }

  start(): void {
    if (this.ctx) return;
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.music.gain.value = this.musicVol;
    this.sfx.gain.value = this.sfxVol;
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMusicVolume(v: number): void {
    this.musicVol = v;
    if (this.ctx) this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setSfxVolume(v: number): void {
    this.sfxVol = v;
    if (this.ctx) this.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ---------- Bausteine ----------

  /** Einfacher Ton mit Frequenzverlauf und Hüllkurve. */
  tone(
    out: AudioNode,
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    vol: number,
    when = 0,
    attack = 0.005,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = Math.max(ctx.currentTime, when || ctx.currentTime);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(
    out: AudioNode,
    dur: number,
    vol: number,
    filter: BiquadFilterType = 'bandpass',
    freq = 2000,
    when = 0,
    q = 1,
    freqEnd?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = Math.max(ctx.currentTime, when || ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}

export const audio = new AudioEngine();
