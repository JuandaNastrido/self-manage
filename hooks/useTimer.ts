/**
 * Custom hooks for managing timer state and data fetching.
 */
import { useState, useEffect, useCallback } from "react";
import { timerApi, ApiError } from "@/lib/api/client";

export interface TimerState {
  id: string;
  taskId: string | null;
  startTime: string;
  pausedAt: string | null;
  accumulatedSeconds: number;
  running: boolean;
  task?: {
    id: string;
    title: string;
    priority: string;
    status: string;
  } | null;
}

export interface UseTimerResult {
  timer: TimerState | null;
  elapsedSeconds: number;
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  start: (taskId?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<number | null>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing timer state with real-time elapsed calculation.
 * Elapsed time is calculated from stored timestamps, not an in-memory counter.
 */
export function useTimer(): UseTimerResult {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateElapsed = useCallback((t: TimerState): number => {
    if (!t.startTime) return 0;

    const startTime = new Date(t.startTime).getTime();
    // A paused timer's clock stops at `pausedAt`; a running one ticks now.
    const endTime = t.running
      ? Date.now()
      : new Date(t.pausedAt ?? t.startTime).getTime();
    const elapsed = Math.floor((endTime - startTime) / 1000) - t.accumulatedSeconds;

    return Math.max(0, elapsed);
  }, []);

  const load = useCallback(async () => {
    try {
      const state = await timerApi.getState();
      setTimer(state);
      if (state) {
        setElapsedSeconds(calculateElapsed(state));
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal memuat timer"
      );
    } finally {
      setIsLoading(false);
    }
  }, [calculateElapsed]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await load();
  }, [load]);

  const start = useCallback(async (taskId?: string) => {
    try {
      setError(null);
      const state = await timerApi.start(taskId!);
      setTimer(state);
      setElapsedSeconds(0);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal memulai timer"
      );
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      setError(null);
      const state = await timerApi.pause();
      setTimer(state);
      setElapsedSeconds(calculateElapsed(state));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal pause timer"
      );
    }
  }, [calculateElapsed]);

  const resume = useCallback(async () => {
    try {
      setError(null);
      const state = await timerApi.resume();
      setTimer(state);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal resume timer"
      );
    }
  }, []);

  const stop = useCallback(async (): Promise<number | null> => {
    try {
      setError(null);
      const result = await timerApi.stop();
      setTimer(null);
      setElapsedSeconds(0);
      return result.elapsedSeconds;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menghentikan timer"
      );
      return null;
    }
  }, []);

  // Poll elapsed time every second when running
  useEffect(() => {
    if (!timer?.running) return;

    const interval = setInterval(() => {
      if (timer) {
        setElapsedSeconds(calculateElapsed(timer));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, calculateElapsed]);

  // Load timer state on mount
  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  return {
    timer,
    elapsedSeconds,
    isRunning: timer?.running ?? false,
    isLoading,
    error,
    start,
    pause,
    resume,
    stop,
    refresh,
  };
}
