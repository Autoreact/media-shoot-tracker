import { TierInfo, PropertyTier } from '@/types';

// ═══════════════════════════════════════════════════════════
// 7 Tiers — NO Deluxe, NO Basic, NO Luxury
// Auto-selection based on beds/baths from Aryeo
// ═══════════════════════════════════════════════════════════

export const TIER_INFO: Record<PropertyTier, TierInfo> = {
  studio: {
    tier: 'studio',
    displayName: 'Studio',
    description: '0-1 bed',
    targetShots: 35,
    beds: 1,
    baths: 1,
  },
  two_two: {
    tier: 'two_two',
    displayName: '2/2',
    description: '2 bed, 2 bath',
    targetShots: 38,
    beds: 2,
    baths: 2,
  },
  three_two: {
    tier: 'three_two',
    displayName: '3/2',
    description: '3 bed, 2 bath',
    targetShots: 40,
    beds: 3,
    baths: 2,
  },
  four_three: {
    tier: 'four_three',
    displayName: '4/3',
    description: '4 bed, 3 bath',
    targetShots: 42,
    beds: 4,
    baths: 3,
  },
  five_three: {
    tier: 'five_three',
    displayName: '5/3',
    description: '5 bed, 3 bath',
    targetShots: 45,
    beds: 5,
    baths: 3,
  },
  five_four: {
    tier: 'five_four',
    displayName: '5/4',
    description: '5 bed, 4 bath',
    targetShots: 48,
    beds: 5,
    baths: 4,
  },
  six_five: {
    tier: 'six_five',
    displayName: '6/5',
    description: '6+ bed, 5+ bath',
    targetShots: 52,
    beds: 6,
    baths: 5,
  },
};

export const TIER_ORDER: PropertyTier[] = [
  'studio',
  'two_two',
  'three_two',
  'four_three',
  'five_three',
  'five_four',
  'six_five',
];

export function getTierInfo(tier: PropertyTier): TierInfo {
  return TIER_INFO[tier];
}

/** Auto-select tier based on beds/baths from Aryeo */
export function autoSelectTier(beds: number, baths: number): PropertyTier {
  if (beds <= 1) return 'studio';
  if (beds === 2 && baths <= 2) return 'two_two';
  if (beds === 3 && baths <= 2) return 'three_two';
  if (beds === 4 && baths <= 3) return 'four_three';
  if (beds === 5 && baths <= 3) return 'five_three';
  if (beds === 5 && baths >= 4) return 'five_four';
  return 'six_five';
}
