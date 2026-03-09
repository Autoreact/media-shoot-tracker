/**
 * Haptic feedback + sound effects for mobile interactions.
 * Uses navigator.vibrate() for haptics (Android + some iOS via WebKit)
 * and Web Audio API for subtle click sounds.
 */

// Vibration patterns (milliseconds)
const PATTERNS = {
  light: [10],      // Quick tap — shot increment
  medium: [20],     // Room complete toggle
  heavy: [30, 50, 30], // Shoot complete
  error: [50, 30, 50], // Decrement at zero
} as const;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Trigger a haptic vibration pattern */
export function vibrate(pattern: keyof typeof PATTERNS = 'light'): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    // Silently fail — haptics not available
  }
}

/** Play a subtle click sound via Web Audio API (no files needed) */
export function playClick(frequency = 1200, duration = 0.03): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail
  }
}

/** Increment shot — light tap + high click */
export function hapticIncrement(): void {
  vibrate('light');
  playClick(1400, 0.025);
}

/** Decrement shot — light tap + lower click */
export function hapticDecrement(): void {
  vibrate('light');
  playClick(800, 0.025);
}

/** Room chip toggled done — medium tap + satisfying click */
export function hapticRoomDone(): void {
  vibrate('medium');
  playClick(1600, 0.04);
}

/** Room chip toggled undone — light tap */
export function hapticRoomUndone(): void {
  vibrate('light');
  playClick(600, 0.02);
}

/** Shoot complete — celebration haptic */
export function hapticComplete(): void {
  vibrate('heavy');
  playClick(2000, 0.06);
}

/** Timer start */
export function hapticTimerStart(): void {
  vibrate('medium');
  playClick(1000, 0.05);
}

/** Timer stop */
export function hapticTimerStop(): void {
  vibrate('medium');
  playClick(600, 0.05);
}
