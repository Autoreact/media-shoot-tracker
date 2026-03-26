'use client';

import { useState, useEffect, useRef } from 'react';
import { ShootState } from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import { getTierInfo } from '@/lib/data/tier-info';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { hapticTimerStart, hapticTimerStop } from '@/lib/utils/haptics';

interface Props {
  shoot: ShootState;
  shootHook: ReturnType<typeof useShoot>;
  onBack: () => void;
}

function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimeDisplay(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TimerScreen({
  shoot,
  shootHook,
  onBack,
}: Props): React.ReactElement {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(shoot.timerSeconds);
  secondsRef.current = shoot.timerSeconds;

  // Timer tick — uses ref to avoid stale closure
  useEffect(() => {
    if (shoot.timerRunning) {
      intervalRef.current = setInterval(() => {
        secondsRef.current += 1;
        shootHook.updateTimerSeconds(secondsRef.current);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shoot.timerRunning, shootHook]);

  // SVG ring — bigger for better visibility
  const ringSize = 280;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxDuration = 7200;
  const progress = Math.min(shoot.timerSeconds / maxDuration, 1);
  const dashOffset = circumference * (1 - progress);

  // Clock tick marks
  const tickMarks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 360) / 60 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const outerR = radius + 2;
    const innerR = isMajor ? radius - 10 : radius - 5;
    return {
      x1: ringSize / 2 + outerR * Math.cos(rad),
      y1: ringSize / 2 + outerR * Math.sin(rad),
      x2: ringSize / 2 + innerR * Math.cos(rad),
      y2: ringSize / 2 + innerR * Math.sin(rad),
      isMajor,
    };
  });

  const isRunning = shoot.timerRunning;
  const [togglSynced, setTogglSynced] = useState(!!shoot.togglTimeEntryId);

  // Keep synced indicator in sync if Toggl entry is set from elsewhere (e.g. auto-start)
  useEffect(() => {
    setTogglSynced(!!shoot.togglTimeEntryId);
  }, [shoot.togglTimeEntryId]);

  // Toggl API integration
  const startTogglEntry = async (): Promise<void> => {
    try {
      const photographerNames: Record<string, string> = {
        nick: 'Nick',
        jared: 'Jared',
        ben: 'Ben',
      };
      const name =
        photographerNames[shoot.photographerId] || shoot.photographerId;
      const res = await fetch('/api/toggl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Order #${shoot.aryeoOrderNumber} — ${shoot.address} — ${name}`,
          tags: ['323media', shoot.tier, shoot.photographerId],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          shootHook.setTogglTimeEntryId(data.id);
          setTogglSynced(true);
        }
      }
    } catch {
      // Toggl is best-effort — timer still works locally
    }
  };

  const stopTogglEntry = async (): Promise<void> => {
    if (!shoot.togglTimeEntryId) return;
    try {
      await fetch('/api/toggl/stop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryId: shoot.togglTimeEntryId }),
      });
    } catch {
      // Best-effort
    }
  };

  // Click-to-type time editing
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);

  const handleTimeInput = (value: string, field: 'start' | 'end'): void => {
    const parts = value.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    if (
      hours === undefined ||
      minutes === undefined ||
      isNaN(hours) ||
      isNaN(minutes)
    )
      return;

    const current = field === 'start' ? shoot.startTime : shoot.endTime;
    const d = current ? new Date(current) : new Date();
    d.setHours(hours, minutes, 0, 0);

    if (field === 'start') {
      const diff =
        (d.getTime() - new Date(shoot.startTime || Date.now()).getTime()) /
        60000;
      shootHook.adjustStartTime(Math.round(diff));
      setEditingStart(false);
    } else {
      const diff =
        (d.getTime() - new Date(shoot.endTime || Date.now()).getTime()) / 60000;
      shootHook.adjustEndTime(Math.round(diff));
      setEditingEnd(false);
    }
  };

  const formatTimeForInput = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-toggl-dark-bg animate-fade-in">
      {/* Header — bigger back button */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-toggl-card-bg flex items-center justify-center"
          >
            <ChevronLeftIcon className="w-6 h-6 text-neutral-300" />
          </button>
          <h2 className="text-sm font-semibold text-toggl-muted uppercase tracking-wider">
            Timer
          </h2>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between px-4 pt-2 pb-6">
        {/* Top section: recording indicator + ring */}
        <div className="flex flex-col items-center">
          {/* Recording indicator */}
          {isRunning && (
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-blink" />
              <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                Recording
              </span>
            </div>
          )}
          {!isRunning && <div className="h-8" />}

          {/* SVG Ring with Timer — bigger */}
          <div className="relative mb-8">
            <svg
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
            >
              {/* Tick marks */}
              {tickMarks.map((tick, i) => (
                <line
                  key={i}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke={tick.isMajor ? '#6B6B8D' : '#3D3D5C'}
                  strokeWidth={tick.isMajor ? 1.5 : 0.5}
                />
              ))}
              {/* Background ring */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="#3D3D5C"
                strokeWidth={strokeWidth}
              />
              {/* Progress ring — blue instead of pink */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="#635BFF"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="progress-ring"
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </svg>
            {/* Time display in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-white font-mono tabular-nums">
                {formatTimerDisplay(shoot.timerSeconds)}
              </span>
              <span className="text-sm text-toggl-muted mt-1">elapsed</span>
            </div>
          </div>
        </div>

        {/* Middle section: working on + time controls */}
        <div className="w-full space-y-3">
          {/* "I'm working on..." card */}
          <div className="w-full bg-toggl-card-bg rounded-xl p-4">
            <p className="text-[10px] text-toggl-muted uppercase tracking-wider mb-1">
              I&apos;m working on...
            </p>
            <p className="text-base font-semibold text-white truncate">
              {shoot.address || 'Shoot'}
            </p>
            <p className="text-xs text-toggl-muted">
              {getTierInfo(shoot.tier).displayName} · Order #
              {shoot.aryeoOrderNumber}
            </p>
          </div>

          {/* Start/End Time Controls */}
          <div className="w-full space-y-2">
            {/* Start time */}
            <div className="flex items-center justify-between bg-toggl-card-bg rounded-xl px-4 py-3">
              <span className="text-sm text-toggl-muted font-medium">
                Start
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shootHook.adjustStartTime(-5)}
                  className="w-8 h-8 rounded-lg bg-toggl-controls flex items-center justify-center"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-toggl-muted" />
                </button>
                {editingStart ? (
                  <input
                    type="time"
                    defaultValue={formatTimeForInput(shoot.startTime)}
                    onBlur={(e) => handleTimeInput(e.target.value, 'start')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        handleTimeInput(
                          (e.target as HTMLInputElement).value,
                          'start'
                        );
                    }}
                    autoFocus
                    className="text-base font-semibold text-white min-w-[5rem] text-center font-mono tabular-nums bg-toggl-controls rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <button
                    onClick={() => setEditingStart(true)}
                    className="text-base font-semibold text-white min-w-[5rem] text-center font-mono tabular-nums hover:text-primary-400 transition-colors"
                  >
                    {formatTimeDisplay(shoot.startTime)}
                  </button>
                )}
                <button
                  onClick={() => shootHook.adjustStartTime(5)}
                  className="w-8 h-8 rounded-lg bg-toggl-controls flex items-center justify-center"
                >
                  <ChevronRightIcon className="w-4 h-4 text-toggl-muted" />
                </button>
              </div>
            </div>

            {/* End time */}
            <div className="flex items-center justify-between bg-toggl-card-bg rounded-xl px-4 py-3">
              <span className="text-sm text-toggl-muted font-medium">End</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shootHook.adjustEndTime(-5)}
                  className="w-8 h-8 rounded-lg bg-toggl-controls flex items-center justify-center"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-toggl-muted" />
                </button>
                {editingEnd ? (
                  <input
                    type="time"
                    defaultValue={formatTimeForInput(shoot.endTime)}
                    onBlur={(e) => handleTimeInput(e.target.value, 'end')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        handleTimeInput(
                          (e.target as HTMLInputElement).value,
                          'end'
                        );
                    }}
                    autoFocus
                    className="text-base font-semibold text-white min-w-[5rem] text-center font-mono tabular-nums bg-toggl-controls rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <button
                    onClick={() => setEditingEnd(true)}
                    className="text-base font-semibold text-white min-w-[5rem] text-center font-mono tabular-nums hover:text-primary-400 transition-colors"
                  >
                    {formatTimeDisplay(shoot.endTime)}
                  </button>
                )}
                <button
                  onClick={() => shootHook.adjustEndTime(5)}
                  className="w-8 h-8 rounded-lg bg-toggl-controls flex items-center justify-center"
                >
                  <ChevronRightIcon className="w-4 h-4 text-toggl-muted" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Start/Stop Button — bigger */}
        <div className="w-full pt-4">
          <button
            onClick={async () => {
              if (isRunning) {
                shootHook.stopTimer();
                hapticTimerStop();
                await stopTogglEntry();
              } else {
                shootHook.startTimer();
                hapticTimerStart();
                await startTogglEntry();
              }
            }}
            className="w-full py-5 rounded-2xl font-bold text-lg text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: isRunning ? '#DF1B41' : '#635BFF' }}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>
          {togglSynced && (
            <p className="text-center text-xs text-toggl-muted mt-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success-500 mr-1 align-middle" />
              Synced to Toggl
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
