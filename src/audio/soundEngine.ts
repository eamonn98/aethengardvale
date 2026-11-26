const AMBIENCE_SEQ = [
  293.66, 369.99, 440.0, 587.33, 440.0, 369.99, 246.94, 329.63, 392.0, 493.88,
  392.0, 329.63, 261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 220.0, 293.66,
  369.99, 440.0, 369.99, 293.66,
] as const;

/**
 * Pure Web Audio API procedural sound effects and 16-bit harp arpeggio engine.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmStep = 0;

  isEnabled(): boolean {
    return this.enabled;
  }

  init(): void {
    if (!this.ctx) {
      const win = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AC = window.AudioContext ?? win.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this.startAmbience();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
    } else if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    return this.enabled;
  }

  playSlash(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = 0.14;
    const buf = this.ctx.createBuffer(
      1,
      Math.floor(this.ctx.sampleRate * dur),
      this.ctx.sampleRate,
    );
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1900, t);
    filter.frequency.exponentialRampToValueAtTime(420, t + dur);
    filter.Q.value = 1.6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter).connect(gain).connect(this.ctx.destination);
    noise.start(t);

    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(760, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.09);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.11, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g2).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.095);
  }

  playHit(crit = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = crit ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(crit ? 340 : 210, t);
    osc.frequency.exponentialRampToValueAtTime(68, t + 0.11);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(crit ? 0.18 : 0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playSlimePop(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.15);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playPlayerHurt(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(175, t);
    osc.frequency.linearRampToValueAtTime(82, t + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  playDash(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(310, t);
    osc.frequency.exponentialRampToValueAtTime(590, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playPickup(): void {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + i * 0.055);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.14);
      osc.connect(g).connect(ctx.destination);
      osc.start(t + i * 0.055);
      osc.stop(t + i * 0.055 + 0.15);
    });
  }

  playFanfare(): void {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t + i * 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.14, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.36);
      osc.connect(g).connect(ctx.destination);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.37);
    });
  }

  playStep(onStone: boolean): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(onStone ? 165 : 105, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.035);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.038, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  startAmbience(): void {
    if (this.bgmTimer !== null || !this.enabled || !this.ctx) return;
    this.bgmTimer = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== "running") return;
      const t = this.ctx.currentTime;
      const f = AMBIENCE_SEQ[this.bgmStep % AMBIENCE_SEQ.length] ?? 293.66;
      this.bgmStep++;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t);
      const lpf = this.ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 1100;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.032, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.62);
      osc.connect(lpf).connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    }, 360);
  }

  dispose(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
