'use client';

import { ShootState } from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import {
  ClockIcon,
  ArrowsRightLeftIcon,
  MinusIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

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

  // SVG progress ring
  const ringSize = 200;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(shoot.quickCountTotal / shoot.target, 1);
  const dashOffset = circumference * (1 - progress);

  // Completion state
  const isTargetReached = shoot.quickCountTotal >= shoot.target;
  const enabledRooms = shoot.rooms.filter((r) => r.enabled);
  const completedRooms = enabledRooms.filter((r) => r.completed);
  const is80PercentDone =
    enabledRooms.length > 0 &&
    completedRooms.length / enabledRooms.length >= 0.8;
  const showGreenComplete = isTargetReached || is80PercentDone;

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-950 truncate max-w-[200px]">
              {shoot.address || 'Quick Count'}
            </h2>
            <p className="text-[10px] text-neutral-400">
              {shoot.tier} · {shoot.target} target
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTimer}
              className="w-8 h-8 rounded-lg bg-toggl-dark-bg flex items-center justify-center"
            >
              <ClockIcon className="w-4 h-4 text-toggl-pink" />
            </button>
            <button
              onClick={onSwitchMode}
              className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"
            >
              <ArrowsRightLeftIcon className="w-4 h-4 text-neutral-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col items-center pb-40">
        {/* Giant Counter */}
        <div className="text-[64px] font-black text-neutral-950 leading-none tabular-nums mb-1">
          {shoot.quickCountTotal}
        </div>

        {/* Target row */}
        <div className="text-sm text-neutral-400 mb-6">
          of <span className="font-semibold text-neutral-600">{shoot.target}</span> target
        </div>

        {/* + Button — full width, 80px tall */}
        <button
          onClick={shootHook.incrementQuickCount}
          className="w-full h-20 rounded-2xl bg-primary-500 flex items-center justify-center active:bg-primary-600 transition-colors mb-3"
        >
          <PlusIcon className="w-10 h-10 text-white" strokeWidth={2.5} />
        </button>

        {/* - Button — centered, smaller */}
        <button
          onClick={shootHook.decrementQuickCount}
          className="w-32 h-12 rounded-xl bg-neutral-200 flex items-center justify-center active:bg-neutral-300 transition-colors mx-auto mb-6"
        >
          <MinusIcon className="w-6 h-6 text-neutral-600" />
        </button>

        {/* SVG Progress Ring */}
        <div className="relative mb-6">
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            {/* Background ring */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#E3E8EF"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
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
            <span className="text-lg font-bold text-neutral-600">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>

        {/* Room Chips — tap to toggle done */}
        <div className="w-full">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Rooms
          </p>
          <div className="flex flex-wrap gap-2">
            {enabledRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => shootHook.toggleRoomChipDone(room.id)}
                className={`chip px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  room.completed ? 'done' : ''
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Complete Button — Always visible */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100">
        <div className="max-w-md mx-auto">
          <button
            onClick={onComplete}
            className={`w-full py-4 rounded-xl text-base font-semibold transition-colors ${
              showGreenComplete
                ? 'bg-success-500 text-white'
                : 'bg-neutral-900 text-white'
            }`}
          >
            {showGreenComplete ? '✓ Complete Shoot' : 'Complete Shoot'}
          </button>
        </div>
      </div>
    </div>
  );
}
