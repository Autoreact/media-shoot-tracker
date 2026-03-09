// ═══════════════════════════════════════════════════════════
// V2 — 323 Media Shoot Tracker Types
// ═══════════════════════════════════════════════════════════

// Room Categories
export type RoomCategory =
  | 'exteriors'
  | 'main_living'
  | 'kitchen_dining'
  | 'beds_baths'
  | 'misc'
  | 'twilights';

// Category display labels for nav bar
export const CATEGORY_LABELS: Record<RoomCategory, string> = {
  exteriors: 'EXT',
  main_living: 'LIV',
  kitchen_dining: 'KIT',
  beds_baths: 'BED',
  misc: 'MISC',
  twilights: 'TWI',
};

// 7 Tiers — NO Deluxe, NO Basic, NO Luxury
export type PropertyTier =
  | 'studio'
  | 'two_two'
  | 'three_two'
  | 'four_three'
  | 'five_three'
  | 'five_four'
  | 'six_five';

// Orientation types
export type Orientation = 'H' | 'V' | 'H+V';

// Shoot mode
export type ShootMode = 'detail' | 'quick';

// Screen navigation
export type AppScreen =
  | 'appointments'
  | 'tier_confirmation'
  | 'room_setup'
  | 'room_tracker'
  | 'quick_count'
  | 'timer'
  | 'completion'
  | 'settings'
  | 'reports';

// Photographer IDs
export type PhotographerId = 'nick' | 'jared' | 'ben';

export interface Photographer {
  id: PhotographerId;
  name: string;
  initials: string;
  color: string;
}

export const PHOTOGRAPHERS: Photographer[] = [
  { id: 'nick', name: 'Nick', initials: 'NR', color: '#635BFF' },
  { id: 'jared', name: 'Jared', initials: 'JR', color: '#FFBB00' },
  { id: 'ben', name: 'Ben', initials: 'BH', color: '#00D924' },
];

// Room Template
export interface RoomTemplate {
  id: string;
  name: string;
  category: RoomCategory;
  orientation: Orientation;
  shots: Record<PropertyTier, number>;
  conditionalDisplay: boolean;
}

// Active Shoot Room
export interface ShootRoom {
  id: string;
  templateId: string;
  name: string;
  category: RoomCategory;
  expectedShots: number;
  actualShots: number;
  orientation: Orientation;
  completed: boolean;
  skipped: boolean;
  notes: string;
  sortOrder: number;
  isCustom: boolean;
  enabled: boolean; // toggle on/off in room setup
}

// Quick Add Room preset
export interface QuickAddRoom {
  id: string;
  name: string;
  category: RoomCategory;
  orientation: Orientation;
  defaultShots: number;
}

// ═══════════════════════════════════════════════════════════
// Aryeo API Types
// ═══════════════════════════════════════════════════════════

export interface AryeoAppointment {
  id: string;
  orderNumber: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED';
  address: string;
  city: string;
  state: string;
  zip: string;
  startAt: string; // ISO datetime
  endAt?: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  brokerage: string;
  services: string[];
  beds: number | null; // null = unknown
  baths: number | null; // null = unknown
  sqft: number;
  furnished: boolean;
  shooterIds: PhotographerId[];
  shooterName?: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════
// Shoot State (core app state)
// ═══════════════════════════════════════════════════════════

export interface ShootState {
  // Identity
  aryeoOrderNumber: string;
  address: string;
  city: string;
  tier: PropertyTier;
  mode: ShootMode;
  photographerId: PhotographerId;

  // Agent info
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  brokerage: string;

  // Property info
  beds: number;
  baths: number;
  sqft: number;
  furnished: boolean;
  services: string[];

  // Rooms
  rooms: ShootRoom[];

  // Shot tracking
  shots: number; // Quick Count total
  target: number;
  quickCountTotal: number;

  // Timer
  timerRunning: boolean;
  timerSeconds: number;
  startTime: string | null; // ISO string
  endTime: string | null;

  // Notes
  notes: Record<string, string>; // roomId -> notes
  globalNotes: string;

  // Dropbox
  dropboxFolderPath: string;

  // Status
  status: 'active' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
}

// Tier Display Info
export interface TierInfo {
  tier: PropertyTier;
  displayName: string;
  description: string;
  targetShots: number;
  beds: number;
  baths: number;
}

// Shoot Summary for completion/email
export interface ShootTotals {
  expectedTotal: number;
  actualTotal: number;
  variance: number;
  completedCount: number;
  skippedCount: number;
  totalCount: number;
  progressPercent: number;
}
