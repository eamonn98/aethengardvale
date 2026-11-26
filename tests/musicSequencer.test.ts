import { describe, expect, test } from "bun:test";
import {
  LookaheadScheduler,
  type MusicPattern,
  VALE_LOOP,
  assertPatternShape,
  channelAt,
  midiToHz,
  secondsPerStep,
  stepTime,
  transposeMidi,
} from "../src/audio/musicSequencer.ts";

const STEP = secondsPerStep(VALE_LOOP);

function patternWith(overrides: Partial<MusicPattern>): MusicPattern {
  return { ...VALE_LOOP, ...overrides };
}

describe("music pattern timing", () => {
  test("derives step duration from tempo and subdivision", () => {
    expect(STEP).toBeCloseTo(60 / 84 / 4, 12);
    expect(STEP).toBeCloseTo(0.178571428, 8);
  });

  test("places steps on the absolute timeline from an origin", () => {
    expect(stepTime(10, 64, STEP)).toBeCloseTo(10 + 64 * STEP, 12);
    expect(stepTime(0, 0, STEP)).toBe(0);
  });

  test("keeps the loop length consistent with the configured grid", () => {
    expect(VALE_LOOP.totalSteps).toBe(32);
    expect(VALE_LOOP.lead).toHaveLength(VALE_LOOP.totalSteps);
    expect(VALE_LOOP.pad).toHaveLength(VALE_LOOP.totalSteps);
    expect(VALE_LOOP.bass).toHaveLength(VALE_LOOP.totalSteps);
    expect(VALE_LOOP.perc).toHaveLength(VALE_LOOP.totalSteps);
    expect(() => assertPatternShape(VALE_LOOP)).not.toThrow();
  });
});

describe("pitch helpers", () => {
  test("converts MIDI note numbers to equal-temperament frequencies", () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(60)).toBeCloseTo(261.6256, 3);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });

  test("transposes by semitones", () => {
    expect(transposeMidi(62, 5)).toBe(67);
    expect(transposeMidi(62, -12)).toBe(50);
    expect(transposeMidi(69, 0)).toBe(69);
  });
});

describe("channel lookup", () => {
  test("wraps the loop in both directions", () => {
    expect(channelAt(VALE_LOOP, "lead", 32)).toBe(channelAt(VALE_LOOP, "lead", 0));
    expect(channelAt(VALE_LOOP, "lead", 33)).toBe(channelAt(VALE_LOOP, "lead", 1));
    expect(channelAt(VALE_LOOP, "bass", -1)).toBe(channelAt(VALE_LOOP, "bass", 31));
  });

  test("exposes rests, chords and percussion hits", () => {
    expect(channelAt(VALE_LOOP, "lead", 0)).toBe(62);
    expect(channelAt(VALE_LOOP, "lead", 24)).toBeNull();
    expect(channelAt(VALE_LOOP, "pad", 0)).toEqual([50, 54, 57]);
    expect(channelAt(VALE_LOOP, "pad", 16)).toEqual([47, 50, 54]);
    expect(channelAt(VALE_LOOP, "perc", 0)).toBe("low");
    expect(channelAt(VALE_LOOP, "perc", 6)).toBe("tick");
    expect(channelAt(VALE_LOOP, "perc", 1)).toBeNull();
  });
});

describe("pattern validation", () => {
  test("rejects channel arrays that do not match the loop length", () => {
    const short = patternWith({ lead: VALE_LOOP.lead.slice(0, 16) });
    expect(() => assertPatternShape(short)).toThrow(/lead has 16 steps/);
    expect(() => new LookaheadScheduler(short, 0)).toThrow(/Invalid music pattern/);
  });

  test("rejects unplayable notes and unknown percussion", () => {
    const badNote = patternWith({
      bass: VALE_LOOP.bass.map((n) => (n === null ? null : 300)),
    });
    expect(() => assertPatternShape(badNote)).toThrow(/bass\[0\]/);

    const badHit = patternWith({
      perc: VALE_LOOP.perc.map(() => "crash" as unknown as "low"),
    });
    expect(() => assertPatternShape(badHit)).toThrow(/unknown hit/);

    const emptyChord = patternWith({
      pad: VALE_LOOP.pad.map(() => [] as readonly number[]),
    });
    expect(() => assertPatternShape(emptyChord)).toThrow(/empty chord/);
  });
});

describe("LookaheadScheduler", () => {
  test("starts at its origin and schedules nothing before it", () => {
    const sched = new LookaheadScheduler(VALE_LOOP, 4);
    expect(sched.step).toBe(0);
    expect(sched.nextStepTime).toBe(4);
    expect(sched.collect(0.5, 0.1)).toEqual([]);
    expect(sched.nextStepTime).toBe(4);
  });

  test("schedules only the steps inside the lookahead horizon", () => {
    const sched = new LookaheadScheduler(VALE_LOOP, 0);
    const due = sched.collect(0, 0.1);
    expect(due).toHaveLength(1);
    expect(due[0]).toEqual({ step: 0, time: 0 });
    expect(sched.nextStepTime).toBeCloseTo(STEP, 12);
  });

  test("advances by whole step durations without accumulating drift", () => {
    const origin = 12.5;
    const sched = new LookaheadScheduler(VALE_LOOP, origin);
    const times: number[] = [];
    let now = origin;
    for (let tick = 0; tick < 4000 && times.length < 500; tick++) {
      for (const due of sched.collect(now, 0.1)) {
        expect(due.step).toBe(times.length % VALE_LOOP.totalSteps);
        times.push(due.time);
      }
      now += 0.025;
    }

    expect(times).toHaveLength(500);
    times.forEach((time, index) => {
      expect(time).toBeCloseTo(origin + index * STEP, 9);
      if (index > 0) expect(time).toBeGreaterThan(times[index - 1] ?? 0);
    });
  });

  test("wraps step indices while time keeps growing", () => {
    const sched = new LookaheadScheduler(VALE_LOOP, 0);
    const due = sched.collect(0, STEP * 34, 40);
    expect(due).toHaveLength(34);
    expect(due[32]).toEqual({ step: 0, time: STEP * 32 });
    expect(due[33]?.step).toBe(1);
    expect(sched.step).toBe(34);
  });

  test("caps catch-up so a stalled tab cannot burst notes", () => {
    const sched = new LookaheadScheduler(VALE_LOOP, 0);
    const due = sched.collect(0, 100);
    expect(due).toHaveLength(8);
    expect(sched.nextStepTime).toBeCloseTo(STEP * 8, 12);

    const capped = new LookaheadScheduler(VALE_LOOP, 0);
    expect(capped.collect(0, 100, 3)).toHaveLength(3);
    expect(capped.nextStepTime).toBeCloseTo(STEP * 3, 12);
  });

  test("reset restarts the loop from a new origin", () => {
    const sched = new LookaheadScheduler(VALE_LOOP, 0);
    sched.collect(0, 1);
    expect(sched.step).toBeGreaterThan(0);

    sched.reset(7.25);
    expect(sched.step).toBe(0);
    expect(sched.nextStepTime).toBe(7.25);
    expect(sched.collect(7.25, 0.01)).toEqual([{ step: 0, time: 7.25 }]);
  });
});
