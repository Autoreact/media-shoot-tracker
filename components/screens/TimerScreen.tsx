'use client';

import { useState, useEffect, useRef } from 'react';
import { ShootState } from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
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

  // SVG ring for timer
  const ringSize = 220;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Ring shows progress over 2 hours (7200 seconds)
  const maxDuration = 7200;
  const progress = Math.min(shoot.timerSeconds / maxDuration, 1);
  const dashOffset = circumference * (1 - progress);

  // Clock tick marks
  const tickMarks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 360) / 60 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const outerR = radius + 2;
    const innerR = isMajor ? radius - 8 : radius - 4;
    return {
      x1: ringSize / 2 + outerR * Math.cos(rad),
      y1: ringSize / 2 + outerR * Math.sin(rad),
      x2: ringSize / 2 + innerR * Math.cos(rad),
      y2: ringSize / 2 + innerR * Math.sin(rad),
      isMajor,
    };
  });

  const isRunning = shoot.timerRunning;

  // Click-to-type time editing
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const handleTimeInput = (
    value: string,
    field: 'start' | 'end'
  ): void => {
    // Parse HH:MM format from time input
    const parts = value.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes)) return;

    const current = field === 'start' ? shoot.startTime : shoot.endTime;
    const d = current ? new Date(current) : new Date();
    d.setHours(hours, minutes, 0, 0);
    const iso = d.toISOString();

    if (field === 'start') {
      shootHook.adjustStartTime(0); // Reset first
      // Direct set via the hook's internal setter
      const diff = (d.getTime() - new Date(shoot.startTime || Date.now()).getTime()) / 60000;
      shootHook.adjustStartTime(Math.round(diff));
      setEditingStart(false);
    } else {
      const diff = (d.getTime() - new Date(shoot.endTime || Date.now()).getTime()) / 60000;
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
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-toggl-muted"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-toggl-muted">Timer</h2>
          <div className="w-8" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pt-4">
        {/* Recording indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-toggl-pink animate-blink" />
            <span className="text-xs font-medium text-toggl-pink uppercase tracking-wider">
              Recording
            </span>
          </div>
        )}

        {/* SVG Ring with Timer */}
        <div className="relative mb-6">
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
            {/* Progress ring */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#E57CD8"
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
            <span className="text-4xl font-black text-white font-mono tabular-nums">
              {formatTimerDisplay(shoot.timerSeconds)}
            </span>
            <span className="text-xs text-toggl-muted mt-1">elapsed</span>
          </div>
        </div>

        {/* "I'm working on..." card */}
        <div className="w-full bg-toggl-card-bg rounded-xl p-3 mb-4">
          <p className="text-[10px] text-toggl-muted uppercase tracking-wider mb-1">
            I'm working on...
          </p>
          <p className="text-sm font-semibold text-white truncate">
            {shoot.address || 'Shoot'}
          </p>
          <p className="text-xs text-toggl-muted">
            {shoot.tier} · Order #{shoot.aryeoOrderNumber}
          </p>
        </div>

        {/* Start/End Time Controls */}
        <div className="w-full space-y-2 mx-3 mb-4">
          {/* Start time */}
          <div className="flex items-center justify-between bg-toggl-card-bg rounded-xl px-3 py-2">
            <span className="text-xs text-toggl-muted">Start</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shootHook.adjustStartTime(-5)}
                className="w-7 h-7 rounded-lg bg-toggl-controls flex items-center justify-center flex-shrink-0"
              >
                <ChevronLeftIcon className="w-3 h-3 text-toggl-muted" />
              </button>
              {editingStart ? (
                <input
                  ref={startInputRef}
                  type="time"
                  defaultValue={formatTimeForInput(shoot.startTime)}
                  onBlur={(e) => handleTimeInput(e.target.value, 'start')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTimeInput((e.target as HTMLInputElement).value, 'start');
                  }}
                  autoFocus
                  className="text-sm font-semibold text-white min-w-[4.5rem] text-center font-mono tabular-nums bg-toggl-controls rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-toggl-pink"
                />
              ) : (
                <button
                  onClick={() => setEditingStart(true)}
                  className="text-sm font-semibold text-white min-w-[4.5rem] text-center font-mono tabular-nums hover:text-toggl-pink transition-colors"
                >
                  {formatTimeDisplay(shoot.startTime)}
                </button>
              )}
              <button
                onClick={() => shootHook.adjustStartTime(5)}
                className="w-7 h-7 rounded-lg bg-toggl-controls flex items-center justify-center flex-shrink-0"
              >
                <ChevronRightIcon className="w-3 h-3 text-toggl-muted" />
              </button>
            </div>
          </div>

          {/* End time */}
          <div className="flex items-center justify-between bg-toggl-card-bg rounded-xl px-3 py-2">
            <span className="text-xs text-toggl-muted">End</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shootHook.adjustEndTime(-5)}
                className="w-7 h-7 rounded-lg bg-toggl-controls flex items-center justify-center flex-shrink-0"
              >
                <ChevronLeftIcon className="w-3 h-3 text-toggl-muted" />
              </button>
              {editingEnd ? (
                <input
                  ref={endInputRef}
                  type="time"
                  defaultValue={formatTimeForInput(shoot.endTime)}
                  onBlur={(e) => handleTimeInput(e.target.value, 'end')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTimeInput((e.target as HTMLInputElement).value, 'end');
                  }}
                  autoFocus
                  className="text-sm font-semibold text-white min-w-[4.5rem] text-center font-mono tabular-nums bg-toggl-controls rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-toggl-pink"
                />
              ) : (
                <button
                  onClick={() => setEditingEnd(true)}
                  className="text-sm font-semibold text-white min-w-[4.5rem] text-center font-mono tabular-nums hover:text-toggl-pink transition-colors"
                >
                  {formatTimeDisplay(shoot.endTime)}
                </button>
              )}
              <button
                onClick={() => shootHook.adjustEndTime(5)}
                className="w-7 h-7 rounded-lg bg-toggl-controls flex items-center justify-center flex-shrink-0"
              >
                <ChevronRightIcon className="w-3 h-3 text-toggl-muted" />
              </button>
            </div>
          </div>
        </div>

        {/* Start/Stop Button */}
        <button
          onClick={() => {
            if (isRunning) {
              shootHook.stopTimer();
              hapticTimerStop();
            } else {
              shootHook.startTimer();
              hapticTimerStart();
            }
          }}
          className="w-full py-4 rounded-xl font-semibold text-base text-white transition-colors"
          style={{ backgroundColor: '#E57CD8' }}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>
    </div>
  );
}
