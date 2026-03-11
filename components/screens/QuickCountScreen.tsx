'use client';

import { useState } from 'react';
import { ShootState } from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import {
  ClockIcon,
  ArrowsRightLeftIcon,
  MinusIcon,
  PlusIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import {
  hapticIncrement,
  hapticDecrement,
  hapticRoomDone,
  hapticRoomUndone,
} from '@/lib/utils/haptics';

interface Props {
  shoot: ShootState;
  shootHook: ReturnType<typeof useShoot>;
  onComplete: () => void;
  onTimer: () => void;
  onSwitchMode: () => void;
}

export default function QuickCountScreen({
  shoot,
  shootHook,
  onComplete,
  onTimer,
  onSwitchMode,
}: Props): React.ReactElement {
  const totals = shootHook.getTotals();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(shoot.target));

  // Progress
  const progress = Math.min(shoot.quickCountTotal / shoot.target, 1);

  // Completion state
  const isTargetReached = shoot.quickCountTotal >= shoot.target;
  const enabledRooms = shoot.rooms.filter((r) => r.enabled);
  const completedRooms = enabledRooms.filter((r) => r.completed);
  const is80PercentDone =
    enabledRooms.length > 0 &&
    completedRooms.length / enabledRooms.length >= 0.8;
  const showGreenComplete = isTargetReached || is80PercentDone;

  const handleTargetSave = (): void => {
    const val = parseInt(targetInput);
    if (val && val > 0) {
      shootHook.updateTarget(val);
    } else {
      setTargetInput(String(shoot.target));
    }
    setEditingTarget(false);
  };

  // SVG progress ring
  const ringSize = 160;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-4 pt-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-neutral-950 dark:text-white truncate">
              {shoot.address || 'Quick Count'}
            </h2>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
              {shoot.tier} · Order #{shoot.aryeoOrderNumber}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={onTimer}
              className="w-9 h-9 rounded-lg bg-toggl-dark-bg flex items-center justify-center"
            >
              <ClockIcon className="w-[18px] h-[18px] text-primary-400" />
            </button>
            <button
              onClick={onSwitchMode}
              className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
            >
              <ArrowsRightLeftIcon className="w-[18px] h-[18px] text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col items-center pb-32">
        {/* Shot Counter — big and prominent */}
        <div className="flex flex-col items-center mb-4">
          <div className="text-[88px] font-black text-neutral-950 dark:text-white leading-none tabular-nums">
            {shoot.quickCountTotal}
          </div>

          {/* Editable target — bigger tap target */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-base text-neutral-400">of</span>
            {editingTarget ? (
              <input
                type="number"
                inputMode="numeric"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={handleTargetSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTargetSave(); }}
                autoFocus
                className="w-20 text-center text-lg font-bold text-neutral-950 dark:text-white bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <button
                onClick={() => {
                  setTargetInput(String(shoot.target));
                  setEditingTarget(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-bold text-neutral-600 dark:text-neutral-300 hover:text-primary-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {shoot.target}
                <PencilIcon className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
        </div>

        {/* + / - Buttons */}
        <div className="w-full space-y-3 mb-5">
          <button
            onClick={() => {
              shootHook.incrementQuickCount();
              hapticIncrement();
            }}
            className="w-full h-20 rounded-2xl bg-primary-500 flex items-center justify-center active:bg-primary-600 active:scale-[0.98] transition-all"
          >
            <PlusIcon className="w-10 h-10 text-white" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => {
              shootHook.decrementQuickCount();
              hapticDecrement();
            }}
            className="w-full h-14 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center active:bg-neutral-300 dark:active:bg-neutral-600 transition-all"
          >
            <MinusIcon className="w-7 h-7 text-neutral-600 dark:text-neutral-300" strokeWidth={2.5} />
          </button>
        </div>

        {/* Progress Ring — below buttons */}
        <div className="relative mb-6">
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#E3E8EF"
              strokeWidth={strokeWidth}
              className="dark:stroke-neutral-700"
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={isTargetReached ? '#00D924' : '#635BFF'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="progress-ring"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-neutral-600 dark:text-neutral-300">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>

        {/* Room Chips Section */}
        {enabledRooms.length > 0 && (
          <div className="w-full bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Rooms
              </p>
              <span className="text-xs text-neutral-400">
                {completedRooms.length}/{enabledRooms.length} done
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {enabledRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    const wasDone = room.completed;
                    shootHook.toggleRoomChipDone(room.id);
                    wasDone ? hapticRoomUndone() : hapticRoomDone();
                  }}
                  className={`chip px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    room.completed ? 'done' : ''
                  }`}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete Button — Always visible */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-md mx-auto">
          <button
            onClick={onComplete}
            className={`w-full py-4 rounded-xl text-base font-semibold transition-colors ${
              showGreenComplete
                ? 'bg-success-500 text-white'
                : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
            }`}
          >
            {showGreenComplete ? '\u2713 Complete Shoot' : 'Complete Shoot'}
          </button>
        </div>
      </div>
    </div>
  );
}
