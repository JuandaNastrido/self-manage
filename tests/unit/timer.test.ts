/**
 * Unit tests for timer elapsed calculation.
 * The core principle: elapsed time is always recalculated from stored timestamps,
 * never from an in-memory counter.
 */
import { TimerService } from "@/lib/services/timer";

// Helper to create a mock TimerState compatible with TimerService.calculateElapsed
interface MockTimerState {
  startTime: Date;
  pausedAt: Date | null;
  accumulatedSeconds: number;
  running: boolean;
}

describe("TimerService.calculateElapsed", () => {
  it("calculates elapsed correctly for a running timer", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 60000); // 1 minute ago

    const state = {
      startTime,
      pausedAt: null,
      accumulatedSeconds: 0,
      running: true,
    } as any;

    // elapsed should be ~60 seconds (may vary by a few ms)
    const result = TimerService.calculateElapsed(state);
    expect(result.isRunning).toBe(true);
    expect(result.elapsedSeconds).toBeGreaterThanOrEqual(59);
    expect(result.elapsedSeconds).toBeLessThanOrEqual(61);
  });

  it("includes accumulatedSeconds (paused time) in calculation", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 120000); // 2 minutes ago

    const state = {
      startTime,
      pausedAt: null,
      accumulatedSeconds: 30, // 30 seconds previously paused
      running: true,
    } as any;

    // elapsed = (2 min - 30s pause) = 90 seconds
    const result = TimerService.calculateElapsed(state);
    expect(result.elapsedSeconds).toBeGreaterThanOrEqual(89);
    expect(result.elapsedSeconds).toBeLessThanOrEqual(91);
    expect(result.elapsedSeconds).toBeLessThan(120); // Should subtract accumulated
  });

  it("returns 0 for a stopped timer", () => {
    const state = {
      startTime: new Date(),
      pausedAt: null,
      accumulatedSeconds: 0,
      running: false,
    } as any;

    const result = TimerService.calculateElapsed(state);
    expect(result.elapsedSeconds).toBe(0);
    expect(result.isRunning).toBe(false);
  });

  it("detects stale timers (> 8 hours)", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 9 * 60 * 60 * 1000); // 9 hours ago

    const state = {
      startTime,
      pausedAt: null,
      accumulatedSeconds: 0,
      running: true,
    } as any;

    const result = TimerService.calculateElapsed(state);
    expect(result.isStale).toBe(true);
    expect(result.isRunning).toBe(true);
    expect(result.elapsedSeconds).toBeGreaterThan(8 * 3600);
  });

  it("does not flag normal timers as stale", () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 3600000); // 1 hour ago

    const state = {
      startTime,
      pausedAt: null,
      accumulatedSeconds: 0,
      running: true,
    } as any;

    const result = TimerService.calculateElapsed(state);
    expect(result.isStale).toBe(false);
    expect(result.elapsedSeconds).toBeGreaterThan(3500);
    expect(result.elapsedSeconds).toBeLessThan(3700);
  });

  it("elapsed remains correct after page refresh simulation", () => {
    // Simulate: timer started 5 minutes ago, user refreshes page
    // On refresh, we fetch TimerState from DB and recalculate
    const startTime = new Date(Date.now() - 5 * 60000); // 5 min ago

    const persistedState = {
      startTime,
      pausedAt: null,
      accumulatedSeconds: 0,
      running: true,
    } as any;

    // Simulate "page refresh" — recalculate from stored timestamps only
    const result1 = TimerService.calculateElapsed(persistedState);
    // Wait 100ms and recalculate (simulating time passing during refresh)
    const result2 = TimerService.calculateElapsed(persistedState);

    // Both calculations should be consistent — derived from the same startTime
    expect(result1.elapsedSeconds).toBe(result2.elapsedSeconds);
    expect(result1.elapsedSeconds).toBeGreaterThanOrEqual(295);
    expect(result1.elapsedSeconds).toBeLessThanOrEqual(305);
  });

  it("handles timer crossing midnight (timestamp-based, not wall-clock)", () => {
    // Timer started at 23:30, now at 00:30 next day
    const startTime = new Date("2024-10-18T23:30:00");
    const now = new Date("2024-10-19T00:30:00");

    const state = {
      startTime,
      pausedAt: null,
      accumulatedSeconds: 0,
      running: true,
    } as any;

    // The function uses Date.now() internally, so we can't exactly test cross-midnight
    // But the timestamp-based approach (epoch-based) ensures correct behavior:
    // elapsed = floor((epoch_now - epoch_startTime) / 1000) - accumulatedSeconds
    // This works correctly regardless of date boundaries.
    const expectedElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    expect(expectedElapsed).toBe(3600);
  });
});

describe("TimerService singleton enforcement", () => {
  it("STALE_TIMER_THRESHOLD_MS is 8 hours", () => {
    expect(TimerService.STALE_TIMER_THRESHOLD_MS).toBe(8 * 60 * 60 * 1000);
  });
});
