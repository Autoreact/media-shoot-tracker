'use client';

import { useState, useRef } from 'react';
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
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const customRoomRef = useRef<HTMLInputElement>(null);

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

  const handleAddRoom = (): void => {
    if (!customRoomName.trim()) return;
    shootHook.addCustomRoom(customRoomName.trim(), activeCategory);
    setCustomRoomName('');
    setShowAddRoom(false);
  };

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-4 pt-3 pb-0 border-b border-neutral-100 dark:border-neutral-800">
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-neutral-950 dark:text-white truncate">
              {shoot.address || 'Room Tracker'}
            </h2>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
              {shoot.tier} · {shoot.target} target
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
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
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

      {/* Room Cards — centered with max width */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-44">
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

        {/* Add Custom Room */}
        {showAddRoom ? (
          <div className="p-4 rounded-xl border border-primary-300 dark:border-primary-600 bg-white dark:bg-neutral-800">
            <input
              ref={customRoomRef}
              type="text"
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddRoom(); }}
              placeholder="Room name..."
              autoFocus
              className="w-full text-sm font-medium text-neutral-950 dark:text-white bg-transparent focus:outline-none placeholder:text-neutral-400 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddRoom}
                disabled={!customRoomName.trim()}
                className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold disabled:opacity-40"
              >
                Add Room
              </button>
              <button
                onClick={() => { setShowAddRoom(false); setCustomRoomName(''); }}
                className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddRoom(true)}
            className="w-full p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-500 dark:text-neutral-400 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Room
          </button>
        )}
      </div>

      {/* Progress Footer + Complete Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-md mx-auto">
          {/* Stats */}
          <div className="px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-900 dark:text-white">
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

          {/* Complete Button */}
          <div className="px-4 pb-4">
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Room Card — bigger, centered, better notes
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
      className={`p-4 rounded-xl border transition-colors ${
        room.completed
          ? 'bg-success-50 dark:bg-success-900/20 border-success-500/30'
          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        {/* Room name — tap to toggle complete */}
        <button
          onClick={onToggleComplete}
          className="flex items-center gap-2.5"
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              room.completed
                ? 'bg-success-500 border-success-500'
                : 'border-neutral-300 dark:border-neutral-600'
            }`}
          >
            {room.completed && (
              <svg
                className="w-3.5 h-3.5 text-white"
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
            className={`text-base font-semibold ${
              room.completed ? 'text-success-700 dark:text-success-400' : 'text-neutral-900 dark:text-white'
            }`}
          >
            {room.name}
          </span>
        </button>

        {/* Notes button — bigger */}
        <button
          onClick={onToggleNotes}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
          {room.notes && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500" />
          )}
        </button>
      </div>

      {/* Counter row — centered */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onDecrement}
          className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center active:bg-neutral-200 dark:active:bg-neutral-600 transition-all active:scale-95"
        >
          <MinusIcon className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
        </button>
        <div className="text-center min-w-[4.5rem]">
          <span className="text-4xl font-black text-neutral-950 dark:text-white tabular-nums">
            {room.actualShots}
          </span>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
            of {room.expectedShots}
          </p>
        </div>
        <button
          onClick={onIncrement}
          className="w-16 h-16 rounded-xl bg-primary-500 flex items-center justify-center active:bg-primary-600 transition-all active:scale-95"
        >
          <PlusIcon className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Notes expandable — bigger textarea */}
      {isNotesExpanded && (
        <div className="mt-3">
          <textarea
            value={room.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Add notes for this room..."
            className="w-full p-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white rounded-xl resize-none h-20 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
          />
        </div>
      )}
    </div>
  );
}
