import { MUSIC_CONFIG } from "../config/constants.ts";

export type MusicChannelId = "lead" | "pad" | "bass" | "perc";
export type PercHit = "low" | "tick";

export interface MusicPattern {
  readonly bpm: number;
  readonly stepsPerBeat: number;
  readonly totalSteps: number;
  /** Plucked harp/lute lead line, MIDI notes; `null` is a rest. */
  readonly lead: readonly (number | null)[];
  /** Warm string pad, MIDI chords sustained from that step; `null` is silent. */
  readonly pad: readonly (readonly number[] | null)[];
  /** Acoustic/synth bass, MIDI notes; `null` is a rest. */
  readonly bass: readonly (number | null)[];
  /** Soft percussion hits; `null` is a rest. */
  readonly perc: readonly (PercHit | null)[];
}

const REST = null;

const D_MAJOR = [50, 54, 57] as const;
const B_MINOR = [47, 50, 54] as const;

/**
 * Two-bar 16-bit vale loop (84 BPM, 16th-note grid) in D major / B minor.
 * The lead line preserves the melody of the original `AMBIENCE_SEQ` arpeggio.
 */
export const VALE_LOOP: MusicPattern = {
  bpm: MUSIC_CONFIG.bpm,
  stepsPerBeat: MUSIC_CONFIG.stepsPerBeat,
  totalSteps: MUSIC_CONFIG.totalSteps,
  lead: [
    62, 66, 69, 74, 69, 66, 59, 64,
    67, 71, 67, 64, 60, 64, 67, 72,
    67, 64, 57, 62, 66, 69, 66, 62,
    REST, REST, REST, REST, 74, 69, 66, 62,
  ],
  pad: [
    D_MAJOR, REST, REST, REST, REST, REST, REST, REST,
    D_MAJOR, REST, REST, REST, REST, REST, REST, REST,
    B_MINOR, REST, REST, REST, REST, REST, REST, REST,
    B_MINOR, REST, REST, REST, REST, REST, REST, REST,
  ],
  bass: [
    38, REST, REST, REST, REST, REST, 50, REST,
    45, REST, REST, REST, REST, REST, 57, REST,
    35, REST, REST, REST, REST, REST, 47, REST,
    43, REST, REST, REST, REST, REST, 55, REST,
  ],
  perc: [
    "low", REST, REST, REST, REST, REST, "tick", REST,
    "low", REST, REST, REST, REST, REST, "tick", REST,
    "low", REST, REST, REST, REST, REST, "tick", REST,
    "low", REST, REST, REST, REST, REST, "tick", REST,
  ],
};

/** Seconds per 16th-note step for a pattern's tempo and subdivision. */
export function secondsPerStep(pattern: MusicPattern): number {
  return 60 / pattern.bpm / pattern.stepsPerBeat;
}

/** Absolute time of `step` when the loop starts at `origin`. */
export function stepTime(origin: number, step: number, stepDuration: number): number {
  return origin + step * stepDuration;
}

/** Equal-temperament frequency for a MIDI note number (A4 = 69 = 440 Hz). */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function transposeMidi(midi: number, semitones: number): number {
  return midi + semitones;
}

/** Channel value at a step, wrapping the loop in both directions. */
export function channelAt<K extends MusicChannelId>(
  pattern: MusicPattern,
  channel: K,
  step: number,
): MusicPattern[K][number] {
  const total = pattern.totalSteps;
  const index = ((Math.trunc(step) % total) + total) % total;
  const wrapped = pattern[channel];
  if (index >= wrapped.length) return null;
  return (wrapped[index] ?? null) as MusicPattern[K][number];
}

function isMidi(value: number): boolean {
  return Number.isFinite(value) && value >= 21 && value <= 108;
}

/**
 * Throws when a pattern cannot be scheduled: channel lengths must match
 * `totalSteps`, lead/bass notes must be playable MIDI numbers, pad must only
 * hold playable chords, and perc only accepts its two hit kinds.
 */
export function assertPatternShape(pattern: MusicPattern): void {
  const problems: string[] = [];
  if (!(pattern.bpm > 0)) problems.push("bpm must be positive");
  if (!(pattern.stepsPerBeat > 0)) problems.push("stepsPerBeat must be positive");
  if (!Number.isInteger(pattern.totalSteps) || pattern.totalSteps <= 0) {
    problems.push("totalSteps must be a positive integer");
  }

  const channels: MusicChannelId[] = ["lead", "pad", "bass", "perc"];
  for (const channel of channels) {
    const length = pattern[channel].length;
    if (length !== pattern.totalSteps) {
      problems.push(`${channel} has ${length} steps, expected ${pattern.totalSteps}`);
    }
  }

  for (const channel of ["lead", "bass"] as const) {
    pattern[channel].forEach((note, step) => {
      if (note !== null && !isMidi(note)) {
        problems.push(`${channel}[${step}] is not a playable MIDI note: ${note}`);
      }
    });
  }
  pattern.pad.forEach((chord, step) => {
    if (chord === null) return;
    if (chord.length === 0) problems.push(`pad[${step}] is an empty chord`);
    for (const note of chord) {
      if (!isMidi(note)) problems.push(`pad[${step}] has an unplayable note: ${note}`);
    }
  });
  pattern.perc.forEach((hit, step) => {
    if (hit !== null && hit !== "low" && hit !== "tick") {
      problems.push(`perc[${step}] has an unknown hit: ${String(hit)}`);
    }
  });

  if (problems.length > 0) {
    throw new Error(`Invalid music pattern: ${problems.join("; ")}`);
  }
}

export interface ScheduledStep {
  /** Loop index (0..totalSteps-1). */
  readonly step: number;
  /** Absolute AudioContext time the step must sound at. */
  readonly time: number;
}

/**
 * Drift-free lookahead clock: a timer only decides when to call `collect`,
 * while note times advance from a fixed origin by whole step durations, so
 * event-loop jitter never accumulates into the grid.
 */
export class LookaheadScheduler {
  private readonly stepDuration: number;
  private cursor = 0;
  private nextTime = 0;

  constructor(
    private readonly pattern: MusicPattern,
    origin = 0,
  ) {
    assertPatternShape(pattern);
    this.stepDuration = secondsPerStep(pattern);
    this.reset(origin);
  }

  /** Next unwrapped step index to schedule. */
  get step(): number {
    return this.cursor;
  }

  /** Absolute time of the next step. */
  get nextStepTime(): number {
    return this.nextTime;
  }

  reset(origin: number): void {
    this.cursor = 0;
    this.nextTime = origin;
  }

  /** Steps due before `now + horizon`, capped so a stalled tab cannot burst. */
  collect(now: number, horizon: number, maxSteps: number = MUSIC_CONFIG.maxCatchUpSteps): ScheduledStep[] {
    const limit = now + horizon;
    const due: ScheduledStep[] = [];
    while (this.nextTime < limit && due.length < maxSteps) {
      due.push({ step: this.cursor % this.pattern.totalSteps, time: this.nextTime });
      this.cursor += 1;
      this.nextTime += this.stepDuration;
    }
    return due;
  }
}
