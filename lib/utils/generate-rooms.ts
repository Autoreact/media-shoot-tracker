import { PropertyTier, ShootRoom } from '@/types';
import { ROOM_TEMPLATES } from '@/lib/data/room-templates';
import { nanoid } from 'nanoid';

/** Generate room list for a tier. All template rooms included, with `enabled` flag. */
export function generateRoomList(tier: PropertyTier): ShootRoom[] {
  const rooms: ShootRoom[] = [];
  let sortOrder = 0;

  for (const template of ROOM_TEMPLATES) {
    const expectedShots = template.shots[tier];

    // Skip rooms that have 0 shots AND are conditional
    if (expectedShots === 0 && template.conditionalDisplay) {
      continue;
    }

    rooms.push({
      id: nanoid(),
      templateId: template.id,
      name: template.name,
      category: template.category,
      expectedShots,
      actualShots: 0,
      orientation: template.orientation,
      completed: false,
      skipped: false,
      notes: '',
      sortOrder: sortOrder++,
      isCustom: false,
      enabled: true,
    });
  }

  return rooms;
}
