import { MUSIC_CONFIG } from "../config/constants.ts";
import {
  type MusicBus,
  createMusicBus,
  playBass,
  playHarpPluck,
  playPerc,
  playStringPad,
} from "./instruments.ts";
import {
  LookaheadScheduler,
  VALE_LOOP,
  channelAt,
  secondsPerStep,
} from "./musicSequencer.ts";

/**
 * Pure Web Audio API procedural sound effects plus a lookahead-scheduled
 * four-channel 16-bit background music loop.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private musicBus: MusicBus | null = null;
  private scheduler: LookaheadScheduler | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private readonly stepDuration = secondsPerStep(VALE_LOOP);

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
    this.startMusic();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
    } else {
      this.stopMusic();
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

  /** Starts (or resumes) the background music loop; safe to call repeatedly. */
  startMusic(): void {
    if (this.musicTimer !== null || !this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    if (!this.musicBus) this.musicBus = createMusicBus(ctx, ctx.destination);
    this.scheduler = new LookaheadScheduler(VALE_LOOP, ctx.currentTime + MUSIC_CONFIG.tickMs / 1000);
    this.pumpMusic();
    this.musicTimer = setInterval(() => this.pumpMusic(), MUSIC_CONFIG.tickMs);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.scheduler = null;
  }

  /**
   * Lookahead tick: the timer only decides *when* to look, while
   * `LookaheadScheduler` derives note times from `AudioContext.currentTime`,
   * so timer jitter never shifts the musical grid.
   */
  private pumpMusic(): void {
    const ctx = this.ctx;
    const scheduler = this.scheduler;
    if (!this.enabled || !ctx || !scheduler || !this.musicBus) return;
    const now = ctx.currentTime;
    if (ctx.state !== "running") {
      scheduler.reset(now + MUSIC_CONFIG.lookaheadSeconds);
      return;
    }
    // A throttled background tab wakes far behind the grid; restart cleanly
    // instead of dumping seconds of stale notes into the present.
    if (scheduler.nextStepTime < now - MUSIC_CONFIG.lookaheadSeconds) {
      scheduler.reset(now + MUSIC_CONFIG.tickMs / 1000);
    }
    for (const due of scheduler.collect(now, MUSIC_CONFIG.lookaheadSeconds)) {
      this.scheduleStep(due.step, due.time);
    }
  }

  private scheduleStep(step: number, time: number): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;

    const accent = step % 8 === 0 ? 1 : step % 4 === 0 ? 0.88 : 0.74;
    const lead = channelAt(VALE_LOOP, "lead", step);
    if (lead !== null) playHarpPluck(ctx, bus, time, lead, accent);

    const chord = channelAt(VALE_LOOP, "pad", step);
    if (chord !== null) {
      playStringPad(ctx, bus, time, chord, this.stepDuration * 8 - 0.02, 0.9);
    }

    const bass = channelAt(VALE_LOOP, "bass", step);
    if (bass !== null) playBass(ctx, bus, time, bass, this.stepDuration * 4, 0.95);

    const hit = channelAt(VALE_LOOP, "perc", step);
    if (hit !== null) playPerc(ctx, bus, time, hit, hit === "low" ? 1 : 0.7);
  }

  dispose(): void {
    this.stopMusic();
    if (this.musicBus) {
      this.musicBus.disconnect();
      this.musicBus = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
