import { MUSIC_CONFIG, SEEDS } from "../config/constants.ts";
import { mulberry32 } from "../core/prng.ts";
import { type PercHit, midiToHz } from "./musicSequencer.ts";

/**
 * Shared stereo delay + hall reverb bus that the background music channels mix
 * into, so the 16-bit loop sits in one warm space instead of in dry isolation.
 */
export interface MusicBus {
  /** Channel voices connect here. */
  readonly input: GainNode;
  /** Post-effect mix; connect once to the destination. */
  readonly output: GainNode;
  disconnect(): void;
}

/** Seeded stereo hall impulse: dense early reflections, exponential tail. */
export function createHallImpulse(ctx: BaseAudioContext): AudioBuffer {
  const seconds = MUSIC_CONFIG.reverbSeconds;
  const decay = MUSIC_CONFIG.reverbDecay;
  const rng = mulberry32(SEEDS.MUSIC_REVERB);
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      // Slight pre-delay keeps the direct 16-bit voices articulate.
      const preDelay = MUSIC_CONFIG.delaySeconds * 0.5;
      const elapsed = progress * seconds - preDelay;
      const envelope = elapsed <= 0 ? 0 : (1 - progress) ** decay;
      data[i] = (rng() * 2 - 1) * envelope;
    }
  }
  return buffer;
}

export function createMusicBus(ctx: BaseAudioContext, destination: AudioNode): MusicBus {
  const input = ctx.createGain();
  input.gain.value = 1;

  const output = ctx.createGain();
  output.gain.value = 0.9;
  output.connect(destination);

  const dry = ctx.createGain();
  dry.gain.value = 0.82;
  input.connect(dry).connect(output);

  // Ping-pong-ish stereo echo: damped feedback keeps the tail from hissing.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = MUSIC_CONFIG.delaySeconds;
  const feedback = ctx.createGain();
  feedback.gain.value = MUSIC_CONFIG.delayFeedback;
  const damping = ctx.createBiquadFilter();
  damping.type = "lowpass";
  damping.frequency.value = MUSIC_CONFIG.delayLowpassHz;
  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.3;
  input.connect(delaySend).connect(delay);
  delay.connect(damping).connect(feedback).connect(delay);
  const delayReturn = ctx.createGain();
  delayReturn.gain.value = 0.55;
  damping.connect(delayReturn).connect(output);

  const reverb = ctx.createConvolver();
  reverb.buffer = createHallImpulse(ctx);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.34;
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.5;
  input.connect(reverbSend).connect(reverb).connect(reverbReturn).connect(output);

  const disconnect = (): void => {
    for (const node of [input, dry, delay, feedback, damping, delaySend, delayReturn, reverb, reverbSend, reverbReturn, output]) {
      node.disconnect();
    }
  };

  return { input, output, disconnect };
}

/** Plucked harp/lute lead: bright triangle body with a short lowpass chime. */
export function playHarpPluck(
  ctx: BaseAudioContext,
  bus: MusicBus,
  time: number,
  midi: number,
  velocity = 1,
): void {
  const freq = midiToHz(midi);
  const decay = 0.85;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);

  const shimmer = ctx.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(freq * 2, time);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(3400, time);
  tone.frequency.exponentialRampToValueAtTime(1200, time + decay);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.075 * velocity, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0008, time + decay);

  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime(0.02 * velocity, time);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0005, time + decay * 0.5);

  osc.connect(tone).connect(gain).connect(bus.input);
  shimmer.connect(shimmerGain).connect(bus.input);
  osc.start(time);
  shimmer.start(time);
  osc.stop(time + decay + 0.02);
  shimmer.stop(time + decay * 0.5 + 0.02);
}

/** Warm string pad: detuned triangle pairs with a slow swell and long release. */
export function playStringPad(
  ctx: BaseAudioContext,
  bus: MusicBus,
  time: number,
  midis: readonly number[],
  duration: number,
  velocity = 1,
): void {
  const attack = 0.26;
  const release = 0.5;
  const end = time + duration;
  const stop = end + release;
  for (const midi of midis) {
    const freq = midiToHz(midi);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    const detune = ctx.createOscillator();
    detune.type = "sine";
    detune.frequency.setValueAtTime(freq, time);
    detune.detune.setValueAtTime(7, time);

    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(1500, time);

    const gain = ctx.createGain();
    const peak = 0.026 * velocity;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + attack);
    gain.gain.setValueAtTime(peak, Math.max(time + attack, end - release));
    gain.gain.exponentialRampToValueAtTime(0.0006, end + release);

    osc.connect(tone);
    detune.connect(tone);
    tone.connect(gain).connect(bus.input);
    osc.start(time);
    detune.start(time);
    osc.stop(stop);
    detune.stop(stop);
  }
}

/** Acoustic/synth bass: rounded triangle fundamental with a soft sine sub. */
export function playBass(
  ctx: BaseAudioContext,
  bus: MusicBus,
  time: number,
  midi: number,
  duration: number,
  velocity = 1,
): void {
  const freq = midiToHz(midi);
  const release = 0.12;
  const end = time + duration;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.1 * velocity, time + 0.02);
  gain.gain.setValueAtTime(0.1 * velocity, Math.max(time + 0.02, end - release));
  gain.gain.exponentialRampToValueAtTime(0.0008, end + release);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(620, time);

  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(freq, time);
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(freq * 0.5, time);
  const subGain = ctx.createGain();
  subGain.gain.value = 0.35;

  body.connect(tone);
  sub.connect(subGain).connect(tone);
  tone.connect(gain).connect(bus.input);

  body.start(time);
  sub.start(time);
  body.stop(end + release + 0.02);
  sub.stop(end + release + 0.02);
}

/** Soft percussion: a felt kick "low" and a filtered noise "tick". */
export function playPerc(
  ctx: BaseAudioContext,
  bus: MusicBus,
  time: number,
  hit: PercHit,
  velocity = 1,
): void {
  if (hit === "low") {
    const decay = 0.22;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(96, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + decay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.11 * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + decay);
    osc.connect(gain).connect(bus.input);
    osc.start(time);
    osc.stop(time + decay + 0.02);
    return;
  }

  const decay = 0.05;
  const length = Math.max(1, Math.floor(ctx.sampleRate * decay));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Seeded noise: the tick sounds identical every loop and nothing on the
  // music path depends on Math.random().
  const rng = mulberry32(SEEDS.MUSIC_REVERB);
  for (let i = 0; i < length; i++) {
    data[i] = (rng() * 2 - 1) * (1 - i / length) ** 3;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const tone = ctx.createBiquadFilter();
  tone.type = "bandpass";
  tone.frequency.setValueAtTime(5200, time);
  tone.Q.value = 1.1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.05 * velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.0006, time + decay);
  noise.connect(tone).connect(gain).connect(bus.input);
  noise.start(time);
  noise.stop(time + decay + 0.01);
}
