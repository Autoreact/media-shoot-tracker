'use client';

import { useState } from 'react';
import { ShootRoom, PropertyTier, RoomCategory, CATEGORY_LABELS } from '@/types';
import { QUICK_ADD_ROOMS } from '@/lib/data/quick-add-rooms';
import { ChevronLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';

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
      <div className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-neutral-600"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Room Setup</h2>
            <p className="text-xs text-neutral-500">
              {enabledCount} rooms · ~{totalExpected} shots
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4 pb-24">
        {/* Room groups */}
        {grouped.map((group) => (
          <div key={group.category}>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => toggleRoom(room.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    room.enabled
                      ? 'bg-white border-neutral-200'
                      : 'bg-neutral-50 border-neutral-100 opacity-50'
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
                    <span className="text-sm font-medium text-neutral-800">
                      {room.name}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
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
            <div className="flex flex-wrap gap-2">
              {QUICK_ADD_ROOMS.filter(
                (qa) => !rooms.find((r) => r.templateId === qa.id)
              ).map((qa) => (
                <button
                  key={qa.id}
                  onClick={() => addQuickAddRoom(qa)}
                  className="px-3 py-1.5 bg-white border border-dashed border-neutral-300 rounded-lg text-xs font-medium text-neutral-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  + {qa.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => onComplete(rooms.filter((r) => r.enabled))}
            className="w-full py-4 bg-primary-500 text-white rounded-xl text-base font-semibold hover:bg-primary-600 active:bg-primary-700 transition-colors"
          >
            Looks Good — Start Shooting
          </button>
        </div>
      </div>
    </div>
  );
}
