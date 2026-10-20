/**
 * Timer service — manages timer state with server-side singleton enforcement.
 * Elapsed time is always recalculated from stored timestamps, never from an in-memory counter.
 *
 * Key design principles:
 * - Only ONE active timer allowed at a time (enforced at DB level via singleton TimerState)
 * - Elapsed = (now - startTime) - accumulatedSeconds when running
 * - Stale timer (>8 hours) auto-detected and reported
 * - Pause/resume use accumulatedSeconds accumulator
 */
import { prisma } from "../prisma";
import { TimerElapsed } from "../types";
import type { TimerState, TimeEntry } from "@prisma/client";

export const STALE_TIMER_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours
export const INACTIVITY_AUTO_STOP_MINUTES = 120; // 2 hours

export class TimerService {
  /**
   * Get the current active timer state.
   * Returns null if no timer is configured.
   */
  static async getTimerState(): Promise<TimerState | null> {
    return prisma.timerState.findUnique({
      where: { id: "active" },
    });
  }

  /**
   * Start a new timer for a task.
   * @throws if a timer is already running and not stale
   */
  static async startTimer(taskId?: string | null): Promise<TimerState> {
    // Check if a running timer already exists
    const existing = await prisma.timerState.findUnique({
      where: { id: "active" },
    });

    if (existing && existing.running) {
      const elapsed = Date.now() - existing.startTime.getTime();
      if (elapsed < STALE_TIMER_THRESHOLD_MS) {
        throw new Error("Timer is already running. Stop or pause the current timer first.");
      }
      // Timer is stale (>8 hours), reclaim it
    }

    // Create or update TimerState (singleton with id "active")
    return await prisma.timerState.upsert({
      where: { id: "active" },
      update: {
        taskId: taskId ?? null,
        startTime: new Date(),
        pausedAt: null,
        accumulatedSeconds: 0,
        running: true,
      },
      create: {
        id: "active",
        taskId: taskId ?? null,
        startTime: new Date(),
        pausedAt: null,
        accumulatedSeconds: 0,
        running: true,
      },
      include: undefined,
    });
  }

  /**
   * Pause the current timer.
   */
  static async pauseTimer(): Promise<TimerState> {
    const existing = await prisma.timerState.findUnique({
      where: { id: "active" },
    });

    if (!existing || !existing.running) {
      throw new Error("No active timer to pause.");
    }

    return await prisma.timerState.update({
      where: { id: "active" },
      data: {
        pausedAt: new Date(),
        running: false,
      },
    });
  }

  /**
   * Resume a paused timer.
   */
  static async resumeTimer(): Promise<TimerState> {
    const existing = await prisma.timerState.findUnique({
      where: { id: "active" },
    });

    if (!existing || existing.running) {
      throw new Error("No paused timer to resume.");
    }

    // Calculate elapsed paused time
    const pausedAt = existing.pausedAt;
    if (!pausedAt) {
      throw new Error("Timer has no pause point.");
    }

    const pauseDuration = Math.floor(
      (Date.now() - pausedAt.getTime()) / 1000
    );

    return await prisma.timerState.update({
      where: { id: "active" },
      data: {
        accumulatedSeconds: existing.accumulatedSeconds + pauseDuration,
        pausedAt: null,
        running: true,
      },
      include: undefined,
    });
  }

  /**
   * Stop the timer and create a TimeEntry.
   * The elapsed time is computed from stored timestamps.
   */
  static async stopTimer(): Promise<{ timeEntry: TimeEntry; elapsedSeconds: number }> {
    const existing = await prisma.timerState.findUnique({
      where: { id: "active" },
    });

    if (!existing) {
      throw new Error("No active timer to stop.");
    }

    if (!existing.running) {
      throw new Error("Timer is not running.");
    }

    // Calculate elapsed time from timestamps
    const now = Date.now();
    const elapsedSeconds = Math.floor(
      (now - existing.startTime.getTime()) / 1000 - existing.accumulatedSeconds
    );

    // Ensure non-negative
    const finalDuration = Math.max(0, elapsedSeconds);

    // Create TimeEntry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        taskId: existing.taskId,
        startTime: existing.startTime,
        endTime: new Date(),
        durationSeconds: finalDuration,
      },
    });

    // Clear timer state (mark as not running, reset for next use)
    await prisma.timerState.update({
      where: { id: "active" },
      data: {
        taskId: null,
        startTime: new Date(0), // epoch as placeholder
        pausedAt: null,
        accumulatedSeconds: 0,
        running: false,
      },
    });

    return { timeEntry, elapsedSeconds: finalDuration };
  }

  /**
   * Calculate current elapsed time from a stored TimerState.
   * Used by frontend to show live elapsed time without polling the DB every second.
   */
  static calculateElapsed(state: TimerState): TimerElapsed {
    const now = Date.now();
    const elapsedMs =
      now - state.startTime.getTime() - state.accumulatedSeconds * 1000;

    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const isStale = elapsedMs > STALE_TIMER_THRESHOLD_MS;

    return {
      elapsedSeconds: Math.max(0, elapsedSeconds),
      isRunning: state.running,
      isStale: isStale && state.running,
    };
  }

  /**
   * Check for stale timer and auto-stop if needed.
   * Returns true if a stale timer was cleaned up.
   */
  static async checkStaleTimer(): Promise<boolean> {
    const existing = await prisma.timerState.findUnique({
      where: { id: "active" },
    });

    if (!existing || !existing.running) return false;

    const elapsed = Date.now() - existing.startTime.getTime();
    if (elapsed > STALE_TIMER_THRESHOLD_MS) {
      // Auto-stop stale timer
      const elapsedSeconds = Math.floor(
        elapsed / 1000 - existing.accumulatedSeconds
      );

      await prisma.$transaction([
        prisma.timeEntry.create({
          data: {
            taskId: existing.taskId,
            startTime: existing.startTime,
            endTime: new Date(),
            durationSeconds: Math.max(0, elapsedSeconds),
          },
        }),
        prisma.timerState.update({
          where: { id: "active" },
          data: {
            running: false,
            taskId: null,
            startTime: new Date(0),
            pausedAt: null,
            accumulatedSeconds: 0,
          },
        }),
      ]);

      return true;
    }
    return false;
  }

  /**
   * Forcefully clear/reset the timer state (for admin/testing).
   */
  static async clearTimer(): Promise<void> {
    await prisma.timerState.deleteMany({});
  }

  /**
   * Get all time entries for a task.
   */
  static async getTimeEntries(taskId: string): Promise<TimeEntry[]> {
    return prisma.timeEntry.findMany({
      where: { taskId },
      orderBy: { startTime: "desc" },
    });
  }

  /**
   * Create a manual time entry (without using the timer).
   */
  static async createManualTimeEntry(data: {
    taskId?: string | null;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    description?: string | null;
  }): Promise<TimeEntry> {
    return prisma.timeEntry.create({
      data: {
        taskId: data.taskId ?? null,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        durationSeconds: data.durationSeconds,
        description: data.description ?? null,
      },
    });
  }
}
