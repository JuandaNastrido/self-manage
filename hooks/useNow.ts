import { useEffect, useState } from "react";

/**
 * Returns a "current time" value that refreshes on an interval.
 *
 * Reading `Date.now()` directly during render is an impure operation, so the
 * timestamp is kept in state instead. The lazy initialiser runs only on the
 * first render, and the interval keeps the value fresh.
 *
 * @param intervalMs - How often to refresh the timestamp (default: 1 minute)
 */
export function useNow(intervalMs: number = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
