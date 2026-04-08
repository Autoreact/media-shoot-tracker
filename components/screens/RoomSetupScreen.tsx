'use client';

import { useState, useRef } from 'react';
import { ShootRoom, PropertyTier, RoomCategory, CATEGORY_LABELS } from '@/types';
import { QUICK_ADD_ROOMS } from '@/lib/data/quick-add-rooms';
import { ChevronLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

interface Props {
  rooms: ShootRoom[];
  tier: PropertyTier;
  onComplete: (rooms: ShootRoom[]) => void;
  onBack: () => void;
  onUpdateRooms: (rooms: ShootRoom[]) => void;
}

const CATEGORIES: RoomCategory[] = [
  'exteriors',
  'main_living',
  'kitchen_dining',
  'beds_baths',
  'misc',
  'twilights',
];

export default function RoomSetupScreen({
  rooms,
  tier,
  onComplete,
  onBack,
  onUpdateRooms,
}: Props): React.ReactElement {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [customRoomCategory, setCustomRoomCategory] = useState<RoomCategory>('misc');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  const toggleRoom = (roomId: string): void => {
    onUpdateRooms(
      rooms.map((r) =>
        r.id === roomId ? { ...r, enabled: !r.enabled } : r
      )
    );
  };

  const addQuickAddRoom = (qaRoom: typeof QUICK_ADD_ROOMS[0]): void => {
    // Check if already added
    if (rooms.find((r) => r.templateId === qaRoom.id)) return;

    const newRoom: ShootRoom = {
      id: nanoid(),
      templateId: qaRoom.id,
      name: qaRoom.name,
      category: qaRoom.category,
      expectedShots: qaRoom.defaultShots,
      actualShots: 0,
      orientation: qaRoom.orientation,
      completed: false,
      skipped: false,
      notes: '',
      sortOrder: rooms.length,
      isCustom: true,
      enabled: true,
    };

    onUpdateRooms([...rooms, newRoom]);
  };

  const addCustomRoom = (): void => {
    if (!customRoomName.trim()) return;

    const newRoom: ShootRoom = {
      id: nanoid(),
      templateId: `custom-${Date.now()}`,
      name: customRoomName.trim(),
      category: customRoomCategory,
      expectedShots: 3,
      actualShots: 0,
      orientation: 'H',
      completed: false,
      skipped: false,
      notes: '',
      sortOrder: rooms.length,
      isCustom: true,
      enabled: true,
    };

    onUpdateRooms([...rooms, newRoom]);
    setCustomRoomName('');
    setShowCustomInput(false);
  };

  const enabledCount = rooms.filter((r) => r.enabled).length;
  const totalExpected = rooms
    .filter((r) => r.enabled)
    .reduce((sum, r) => sum + r.expectedShots, 0);

  // Group rooms by category
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    rooms: rooms.filter((r) => r.category === cat),
  })).filter((g) => g.rooms.length > 0);

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400 shrink-0"
              aria-label="Back"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
                Room Setup
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {enabledCount} rooms · ~{totalExpected} shots
              </p>
            </div>
          </div>
          {rooms.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-error-500 text-sm font-semibold px-2 py-2 shrink-0"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4 pb-24">
        {/* Room groups */}
        {grouped.map((group) => (
          <div key={group.category}>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => toggleRoom(room.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    room.enabled
                      ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                      : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                        room.enabled
                          ? 'bg-primary-500 border-primary-500'
                          : 'bg-white border-neutral-300'
                      }`}
                    >
                      {room.enabled && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {room.name}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {room.expectedShots} shots
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Quick Add */}
        <div>
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-2 text-sm font-semibold text-primary-600 mb-2"
          >
            <PlusIcon className="w-4 h-4" />
            Quick Add Rooms
          </button>
          {showQuickAdd && (
            <div className="space-y-3">
              {/* Preset rooms */}
              <div className="flex flex-wrap gap-2">
                {QUICK_ADD_ROOMS.filter(
                  (qa) => !rooms.find((r) => r.templateId === qa.id)
                ).map((qa) => (
                  <button
                    key={qa.id}
                    onClick={() => addQuickAddRoom(qa)}
                    className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
                  >
                    + {qa.name}
                  </button>
                ))}
              </div>

              {/* Custom Room Input */}
              {showCustomInput ? (
                <div className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-primary-300 dark:border-primary-600">
                  <input
                    ref={customInputRef}
                    type="text"
                    value={customRoomName}
                    onChange={(e) => setCustomRoomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCustomRoom(); }}
                    placeholder="Room name..."
                    autoFocus
                    className="w-full text-sm font-medium text-neutral-950 dark:text-white bg-transparent focus:outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 mb-2"
                  />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Category:</span>
                    <div className="flex gap-1">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCustomRoomCategory(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            customRoomCategory === cat
                              ? 'bg-primary-500 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addCustomRoom}
                      disabled={!customRoomName.trim()}
                      className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold disabled:opacity-40"
                    >
                      Add Room
                    </button>
                    <button
                      onClick={() => { setShowCustomInput(false); setCustomRoomName(''); }}
                      className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-500 dark:text-neutral-400 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Custom Room
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Start Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => onComplete(rooms.filter((r) => r.enabled))}
            className="w-full py-4 bg-primary-500 text-white rounded-xl text-base font-semibold hover:bg-primary-600 active:bg-primary-700 transition-colors"
          >
            Looks Good — Start Shooting
          </button>
        </div>
      </div>

      {/* Clear All confirm dialog */}
      <AlertDialog.Root open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-2xl">
            <AlertDialog.Title className="text-lg font-bold text-neutral-950 dark:text-white mb-2">
              Clear all rooms?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-neutral-600 dark:text-neutral-300 mb-5">
              This removes every room from the setup. You can re-add them from
              the quick-add list or custom entry.
            </AlertDialog.Description>
            <div className="flex flex-col gap-2">
              <AlertDialog.Action
                onClick={() => {
                  onUpdateRooms([]);
                  setShowClearConfirm(false);
                }}
                className="w-full min-h-[48px] rounded-xl bg-error-500 text-white text-sm font-semibold active:bg-error-600 transition-colors"
              >
                Clear All Rooms
              </AlertDialog.Action>
              <AlertDialog.Cancel className="w-full min-h-[48px] rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                Cancel
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
