import { describe, it, expect } from 'vitest';
import { computeElapsedSeconds } from '../timer';

describe('computeElapsedSeconds — derived elapsed (not incremented)', () => {
  it('returns 0 when startTime is null', () => {
    expect(computeElapsedSeconds(null, Date.now())).toBe(0);
  });

  it('returns 0 when startTime is undefined', () => {
    expect(computeElapsedSeconds(undefined, Date.now())).toBe(0);
  });

  it('returns floor of seconds between start and now', () => {
    const start = '2026-04-07T12:00:00.000Z';
    const now = new Date('2026-04-07T12:00:42.500Z').getTime();
    expect(computeElapsedSeconds(start, now)).toBe(42);
  });

  it('clamps negative values (clock skew) to 0', () => {
    const start = '2026-04-07T12:00:10.000Z';
    const now = new Date('2026-04-07T12:00:05.000Z').getTime();
    expect(computeElapsedSeconds(start, now)).toBe(0);
  });

  /**
   * P0 regression test — the bug this phase exists to fix.
   *
   * Old code used `secondsRef.current += 1` inside setInterval, which iOS Safari
   * throttles aggressively when the PWA is backgrounded. A 2-hour real-time gap
   * with only ~9 interval ticks produced `elapsed === 9` instead of ~7200.
   *
   * The fix: elapsed is DERIVED from `Date.now() - startTime`, so the number of
   * ticks is irrelevant — only wall-clock matters. Simulate the exact scenario.
   */
  it('reports 7200 after a 2-hour background gap even with only 9 ticks', () => {
    const startTime = '2026-04-07T12:00:00.000Z';
    const startMs = new Date(startTime).getTime();

    // Simulate 9 ticks inside the first 9 seconds (foregrounded)
    const tickTimes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
    for (const deltaMs of tickTimes) {
      const elapsed = computeElapsedSeconds(startTime, startMs + deltaMs);
      expect(elapsed).toBe(Math.floor(deltaMs / 1000));
    }

    // Now the PWA was backgrounded for 2 hours with no ticks.
    // When it wakes (visibilitychange), we tick once.
    const twoHoursLater = startMs + 7200 * 1000;
    const finalElapsed = computeElapsedSeconds(startTime, twoHoursLater);

    // A counter-based implementation would return 9.
    // A derived implementation returns 7200. This is the whole point of Phase 2.
    expect(finalElapsed).toBe(7200);
  });
});
