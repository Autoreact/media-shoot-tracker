'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ShootState,
  RoomCategory,
  CATEGORY_LABELS,
  ShootRoom,
} from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import {
  ClockIcon,
  ArrowsRightLeftIcon,
  ChatBubbleLeftEllipsisIcon,
  MinusIcon,
  PlusIcon,
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

const CATEGORIES: RoomCategory[] = [
  'exteriors',
  'main_living',
  'kitchen_dining',
  'beds_baths',
  'misc',
  'twilights',
];

export default function RoomTrackerScreen({
  shoot,
  shootHook,
  onComplete,
  onTimer,
  onSwitchMode,
}: Props): React.ReactElement {
  const [activeCategory, setActiveCategory] = useState<RoomCategory>('exteriors');
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totals = shootHook.getTotals();

  // Get rooms for current view, grouped by category
  const visibleCategories = CATEGORIES.filter((cat) =>
    shoot.rooms.some((r) => r.category === cat && r.enabled)
  );

  const currentRooms = shoot.rooms.filter(
    (r) => r.category === activeCategory && r.enabled
  );

  // Check completion state
  const isTargetReached = totals.actualTotal >= shoot.target;
  const is80PercentDone =
    totals.totalCount > 0 &&
    totals.completedCount / totals.totalCount >= 0.8;
  const showGreenComplete = isTargetReached || is80PercentDone;

  // Scroll to category section
  const scrollToCategory = (cat: RoomCategory): void => {
    setActiveCategory(cat);
  };

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-3 pb-0 border-b border-neutral-100">
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold text-neutral-950 truncate max-w-[200px]">
              {shoot.address || 'Room Tracker'}
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

        {/* Category nav */}
        <div className="flex gap-1 overflow-x-auto hide-scrollbar pb-2">
          {visibleCategories.map((cat) => {
            const isActive = activeCategory === cat;
            const catRooms = shoot.rooms.filter(
              (r) => r.category === cat && r.enabled
            );
            const doneCount = catRooms.filter((r) => r.completed).length;
            return (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {CATEGORY_LABELS[cat]}
                {doneCount > 0 && (
                  <span className="ml-1 opacity-70">
                    {doneCount}/{catRooms.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Cards */}
      <div className="flex-1 px-4 py-3 space-y-2 pb-40">
        {currentRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onIncrement={() => {
              shootHook.incrementShot(room.id);
              hapticIncrement();
            }}
            onDecrement={() => {
              shootHook.decrementShot(room.id);
              hapticDecrement();
            }}
            onToggleComplete={() => {
              const wasDone = room.completed;
              shootHook.toggleRoomComplete(room.id);
              wasDone ? hapticRoomUndone() : hapticRoomDone();
            }}
            onUpdateNotes={(notes) => shootHook.updateRoomNotes(room.id, notes)}
            isNotesExpanded={expandedNotes === room.id}
            onToggleNotes={() =>
              setExpandedNotes(expandedNotes === room.id ? null : room.id)
            }
          />
        ))}
      </div>

      {/* Progress Footer + Complete Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100">
        <div className="max-w-md mx-auto">
          {/* Stats */}
          <div className="px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-900">
              {totals.actualTotal}{' '}
              <span className="text-neutral-400 font-normal">
                / {shoot.target} shots
              </span>
            </span>
            <span className="text-neutral-400">
              {totals.completedCount}/{totals.totalCount} rooms
            </span>
            <span
              className={`font-bold ${
                totals.variance >= 0
                  ? 'text-success-600'
                  : totals.variance >= -5
                  ? 'text-warning-600'
                  : 'text-error-500'
              }`}
            >
              {totals.variance >= 0 ? '+' : ''}
              {totals.variance}
            </span>
          </div>

          {/* Complete Button — Always visible */}
          <div className="px-4 pb-4">
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Room Card
// ═══════════════════════════════════════════════════════════

function RoomCard({
  room,
  onIncrement,
  onDecrement,
  onToggleComplete,
  onUpdateNotes,
  isNotesExpanded,
  onToggleNotes,
}: {
  room: ShootRoom;
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleComplete: () => void;
  onUpdateNotes: (notes: string) => void;
  isNotesExpanded: boolean;
  onToggleNotes: () => void;
}): React.ReactElement {
  return (
    <div
      className={`p-3 rounded-xl border transition-colors ${
        room.completed
          ? 'bg-success-50 border-success-500/30'
          : 'bg-white border-neutral-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        {/* Room name — tap to toggle complete */}
        <button
          onClick={onToggleComplete}
          className="flex items-center gap-2"
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              room.completed
                ? 'bg-success-500 border-success-500'
                : 'border-neutral-300'
            }`}
          >
            {room.completed && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <span
            className={`text-sm font-semibold ${
              room.completed ? 'text-success-700' : 'text-neutral-900'
            }`}
          >
            {room.name}
          </span>
        </button>

        {/* Notes dot */}
        <button
          onClick={onToggleNotes}
          className="relative w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100"
        >
          <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
          {room.notes && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary-500" />
          )}
        </button>
      </div>

      {/* Counter row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onDecrement}
            className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center active:bg-neutral-200 transition-colors"
          >
            <MinusIcon className="w-5 h-5 text-neutral-600" />
          </button>
          <span className="text-3xl font-bold text-neutral-950 min-w-[3ch] text-center tabular-nums">
            {room.actualShots}
          </span>
          <button
            onClick={onIncrement}
            className="w-14 h-14 rounded-xl bg-primary-500 flex items-center justify-center active:bg-primary-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5 text-white" />
          </button>
        </div>
        <span className="text-xs text-neutral-400">
          of {room.expectedShots}
        </span>
      </div>

      {/* Notes expandable */}
      {isNotesExpanded && (
        <div className="mt-2">
          <textarea
            value={room.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Add notes for this room..."
            className="w-full p-2 text-xs border border-neutral-200 rounded-lg resize-none h-16 focus:outline-none focus:border-primary-400"
          />
        </div>
      )}
    </div>
  );
}
