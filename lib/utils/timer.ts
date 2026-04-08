/**
 * Derive elapsed seconds from a fixed start timestamp and a "now" reading.
 *
 * This replaces the old counter-based approach (`secondsRef.current += 1`)
 * that was throttled by iOS Safari when the PWA was backgrounded, producing
 * ~9 minutes of elapsed time for a 2-hour real shoot. By deriving from
 * wall-clock time on every read, the number of ticks the interval manages
 * to fire is irrelevant — only `Date.now() - startTime` matters.
 */
export function computeElapsedSeconds(
  startTime: string | null | undefined,
  nowMs: number = Date.now()
): number {
  if (!startTime) return 0;
  const startMs = new Date(startTime).getTime();
  if (Number.isNaN(startMs)) return 0;
  const delta = Math.floor((nowMs - startMs) / 1000);
  return delta > 0 ? delta : 0;
}
