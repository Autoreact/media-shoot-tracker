import { RoomTemplate } from '@/types';

// ═══════════════════════════════════════════════════════════
// Room Templates — V2 with 7 Tiers
// Tier targets: Studio ~35, 2/2 ~38, 3/2 ~40, 4/3 ~42,
//               5/3 ~45, 5/4 ~48, 6/5 ~52
// ═══════════════════════════════════════════════════════════

export const ROOM_TEMPLATES: RoomTemplate[] = [
  // ═══════════════════════════════════════════════════════════
  // EXTERIORS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'ext_front_wide',
    name: 'Exterior Front Wide',
    category: 'exteriors',
    orientation: 'H',
    shots: { studio: 2, two_two: 3, three_two: 3, four_three: 3, five_three: 3, five_four: 3, six_five: 3 },
    conditionalDisplay: false,
  },
  {
    id: 'ext_front_walkup',
    name: 'Exterior Front Walkup',
    category: 'exteriors',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 1, four_three: 1, five_three: 1, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'ext_back_wide',
    name: 'Exterior Back Wide',
    category: 'exteriors',
    orientation: 'H',
    shots: { studio: 2, two_two: 3, three_two: 3, four_three: 3, five_three: 3, five_four: 3, six_five: 4 },
    conditionalDisplay: false,
  },
  {
    id: 'pool_spa',
    name: 'Pool',
    category: 'exteriors',
    orientation: 'H',
    shots: { studio: 0, two_two: 2, three_two: 2, four_three: 2, five_three: 2, five_four: 2, six_five: 3 },
    conditionalDisplay: true,
  },
  {
    id: 'ext_details',
    name: 'Details and Features',
    category: 'exteriors',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'ext_views',
    name: 'Views',
    category: 'exteriors',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 3 },
    conditionalDisplay: true,
  },

  // ═══════════════════════════════════════════════════════════
  // MAIN LIVING AREA
  // ═══════════════════════════════════════════════════════════
  {
    id: 'entryway',
    name: 'Entryway',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 1, two_two: 1, three_two: 1, four_three: 1, five_three: 1, five_four: 1, six_five: 1 },
    conditionalDisplay: false,
  },
  {
    id: 'grand_entrance',
    name: 'Grand Entrance',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'open_concept',
    name: 'Open Concept Wide',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 1, two_two: 1, three_two: 1, four_three: 1, five_three: 1, five_four: 1, six_five: 2 },
    conditionalDisplay: false,
  },
  {
    id: 'living_room',
    name: 'Living Room',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 2, two_two: 2, three_two: 2, four_three: 2, five_three: 2, five_four: 2, six_five: 3 },
    conditionalDisplay: false,
  },
  {
    id: 'family_room',
    name: 'Family Room',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 0, two_two: 1, three_two: 2, four_three: 2, five_three: 3, five_four: 3, six_five: 4 },
    conditionalDisplay: true,
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 1, four_three: 1, five_three: 1, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'staircase',
    name: 'Staircase',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'living_views',
    name: 'Views',
    category: 'main_living',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 1, six_five: 2 },
    conditionalDisplay: true,
  },

  // ═══════════════════════════════════════════════════════════
  // KITCHEN, DINING
  // ═══════════════════════════════════════════════════════════
  {
    id: 'kitchen',
    name: 'Kitchen',
    category: 'kitchen_dining',
    orientation: 'H',
    shots: { studio: 2, two_two: 2, three_two: 3, four_three: 3, five_three: 3, five_four: 3, six_five: 4 },
    conditionalDisplay: false,
  },
  {
    id: 'eat_in_kitchen',
    name: 'Eat-In Kitchen',
    category: 'kitchen_dining',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 1, four_three: 1, five_three: 1, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'indoor_outdoor',
    name: 'Indoor-Outdoor',
    category: 'kitchen_dining',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 1, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'dining_room',
    name: 'Dining Room',
    category: 'kitchen_dining',
    orientation: 'H',
    shots: { studio: 1, two_two: 2, three_two: 2, four_three: 2, five_three: 2, five_four: 2, six_five: 2 },
    conditionalDisplay: false,
  },

  // ═══════════════════════════════════════════════════════════
  // BEDS, BATHS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'master_bedroom',
    name: 'Master Bedroom',
    category: 'beds_baths',
    orientation: 'H',
    shots: { studio: 2, two_two: 2, three_two: 2, four_three: 2, five_three: 2, five_four: 2, six_five: 3 },
    conditionalDisplay: false,
  },
  {
    id: 'master_bathroom',
    name: 'Master Bathroom',
    category: 'beds_baths',
    orientation: 'H+V',
    shots: { studio: 2, two_two: 2, three_two: 2, four_three: 2, five_three: 2, five_four: 3, six_five: 4 },
    conditionalDisplay: false,
  },
  {
    id: 'master_closet',
    name: 'Master Closet',
    category: 'beds_baths',
    orientation: 'V',
    shots: { studio: 0, two_two: 1, three_two: 1, four_three: 1, five_three: 1, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'bedroom_2',
    name: 'Bedroom 2',
    category: 'beds_baths',
    orientation: 'H',
    shots: { studio: 0, two_two: 2, three_two: 2, four_three: 2, five_three: 2, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'bedroom_3',
    name: 'Bedroom 3',
    category: 'beds_baths',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 2, four_three: 2, five_three: 2, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'bedroom_4',
    name: 'Bedroom 4',
    category: 'beds_baths',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 2, five_three: 2, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'bedroom_5',
    name: 'Bedroom 5',
    category: 'beds_baths',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 2, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'bedroom_6',
    name: 'Bedroom 6',
    category: 'beds_baths',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'bathroom_2',
    name: 'Bathroom 2',
    category: 'beds_baths',
    orientation: 'H+V',
    shots: { studio: 0, two_two: 2, three_two: 2, four_three: 2, five_three: 2, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'bathroom_3',
    name: 'Bathroom 3',
    category: 'beds_baths',
    orientation: 'H+V',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 2, five_three: 2, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'bathroom_4',
    name: 'Bathroom 4',
    category: 'beds_baths',
    orientation: 'H+V',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 2, six_five: 2 },
    conditionalDisplay: true,
  },

  // ═══════════════════════════════════════════════════════════
  // MISC
  // ═══════════════════════════════════════════════════════════
  {
    id: 'den_office',
    name: 'Den/Office/Loft',
    category: 'misc',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 1, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'laundry',
    name: 'Laundry Room',
    category: 'misc',
    orientation: 'H+V',
    shots: { studio: 0, two_two: 0, three_two: 1, four_three: 1, five_three: 1, five_four: 1, six_five: 1 },
    conditionalDisplay: true,
  },
  {
    id: 'media_room',
    name: 'Media Room',
    category: 'misc',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 2 },
    conditionalDisplay: true,
  },
  {
    id: 'detail_shots',
    name: 'Detail Shots',
    category: 'misc',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 3 },
    conditionalDisplay: true,
  },
  {
    id: 'community',
    name: 'Community',
    category: 'misc',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 0 },
    conditionalDisplay: true,
  },

  // ═══════════════════════════════════════════════════════════
  // TWILIGHTS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'twilight_front',
    name: 'Exterior Front',
    category: 'twilights',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 0 },
    conditionalDisplay: true,
  },
  {
    id: 'twilight_back',
    name: 'Backyard/Pool/Spa',
    category: 'twilights',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 0 },
    conditionalDisplay: true,
  },
  {
    id: 'twilight_views',
    name: 'Views',
    category: 'twilights',
    orientation: 'H',
    shots: { studio: 0, two_two: 0, three_two: 0, four_three: 0, five_three: 0, five_four: 0, six_five: 0 },
    conditionalDisplay: true,
  },
];
