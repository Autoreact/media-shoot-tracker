# 323 Media Shoot Tracker — V2 Implementation Prompt

## Context

You are implementing a complete V2 redesign of the **323 Media Shoot Tracker**, a mobile-first PWA for real estate photographers in Tallahassee, FL. The app helps photographers track room-by-room photo counts during property shoots, integrates with Aryeo for appointment data, auto-creates Dropbox folders, and tracks time Toggl-style.

**Repository:** `github.com/Autoreact/media-shoot-tracker`
**Branch:** `feature/v2-redesign`
**Deployed at:** `media-shoot-tracker.vercel.app`
**Stack:** Next.js 16.1 · React 19 · Tailwind CSS 4 · Supabase · Vercel · Aryeo API

### Reference Documents (on the `feature/v2-redesign` branch)

1. **`docs/323-Media-Shoot-Tracker-v2-Spec.md`** — The complete product specification with every screen, feature, database schema, API routes, state management, and implementation phases. **Read this entire file first.**
2. **`docs/v2-mockup.html`** — The interactive HTML mockup (925 lines) that is the **definitive UI reference**. Open this in a browser to see all 7 screens with full interactivity. Every pixel, color, spacing, and interaction in this file is intentional and approved. **Match it exactly.**

### Existing Codebase (on `master`)

The V1 codebase has these key files you should understand before building:

```
├── app/
│   ├── layout.tsx              # Root layout with Inter font
│   ├── page.tsx                # Current home page (basic shoot list)
│   ├── globals.css             # Tailwind 4 + custom CSS vars
│   ├── api/send-summary/       # Email summary API route (Resend)
│   └── shoot/                  # Current shoot tracking pages
├── components/
│   ├── RoomCard.tsx            # Room counter card (refactor for V2)
│   ├── RoomCategory.tsx        # Category grouping
│   ├── AddRoomModal.tsx        # Room quick-add modal
│   ├── TemplateSelector.tsx    # Tier/template selection
│   ├── ShootSummary.tsx        # Completion summary
│   ├── ProgressBar.tsx         # Progress indicator
│   ├── EmptyState.tsx          # Empty state component
│   ├── OrientationBadge.tsx    # Photo orientation badge
│   ├── SuccessAnimation.tsx    # Completion animation
│   ├── LoadingSpinner.tsx      # Loading state
│   ├── PageTransition.tsx      # Page transitions
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── hooks/
│   │   ├── useShoot.ts         # Core shoot state hook (EXTEND for V2)
│   │   └── useLocalStorage.ts  # localStorage persistence
│   ├── data/
│   │   ├── room-templates.ts   # Room templates by tier (UPDATE for 7 tiers)
│   │   ├── tier-info.ts        # Tier definitions (UPDATE — remove Deluxe/Basic/Luxury)
│   │   └── quick-add-rooms.ts  # Quick-add room options
│   └── utils.ts                # Utility functions (cn helper)
├── types/
│   └── index.ts                # TypeScript interfaces (EXTEND)
├── package.json                # Next.js 16.1, React 19, Tailwind 4
└── tsconfig.json
```

**Key dependencies already installed:** `next@16.1.0`, `react@19.2.3`, `tailwindcss@4`, `lucide-react`, `@heroicons/react`, `nanoid`, `clsx`, `tailwind-merge`, `@radix-ui/react-dialog`, `@radix-ui/react-progress`

**Dependencies to add:** `@supabase/supabase-js`, `@headlessui/react@2.2.9` (for transitions/dialogs)

---

## What to Build

### The 7 Screens

Build these as a single-page app with client-side navigation (no Next.js file-based routing for the shoot flow — use state to switch screens). The appointments page is the entry point at `/`.

1. **Appointments (Home)** — Aryeo-powered appointment list with date navigation, shooter filter, agent contact info, cancelled appointment handling
2. **Tier Confirmation** — Property details + AI tier suggestion + 7-tier selector + mode choice (Room Tracker vs Quick Count)
3. **Room Setup** — Toggle switches for default rooms + Quick Add for extras
4. **Room Tracker** (Nick's mode) — Category-based room cards with +/- counters, notes, always-visible Complete button
5. **Quick Count** (Jared's mode) — Giant clicker + room chips + SVG progress ring
6. **Timer** — Full-screen Toggl-style dark theme with SVG ring, start/stop, time adjustment
7. **Completion** — Stats, duration editor, skipped rooms warning, Dropbox link, attachments, Save & Email

### Design System

**Colors (Stripe-inspired):**
```
Primary:    #635BFF (purple)
Success:    #00D924 (green)
Warning:    #FFBB00 (amber)
Error:      #DF1B41 (red)
Neutral:    #1F2933 → #F6F9FC
```

**Timer palette (Toggl-inspired):**
```
Dark BG:    #1A1A2E
Card BG:    #2D2D44
Pink Ring:  #E57CD8
Muted:      #6B6B8D
Controls:   #3D3D5C
```

**Photographer colors:**
```
Nick:   #635BFF (purple)  — initials "NR"
Jared:  #FFBB00 (amber)   — initials "JR"
Ben:    #00D924 (green)    — initials "BH"
```

**Font:** Inter from Google Fonts. Shot counts 48-64px bold. Addresses 17-22px bold. Body 14-15px. Labels 10-11px uppercase tracking-wider.

**Tap targets:** Minimum 48px for all interactive elements. Primary actions 56px+. Quick Count + button full width 80px+ tall.

### Critical Implementation Details

#### Aryeo API Integration
- Fetch appointments from `GET /v1/orders` with `include=items,appointments,customer,address,payments`
- Filter by date using `filter[appointment_start_at_gte]` and `filter[appointment_start_at_lte]`
- Create a server-side API route (`/api/appointments`) that proxies to Aryeo (API key stays server-side)
- Parse `custom_fields` (step-3 array) for beds, baths, sqft, furnished status
- Check `appointments[].users[]` for photographer assignment — fall back to manual selection if empty
- Key fields: `number` (order#), `status`, `customer.name`, `customer.phone`, `address.unparsed_address`, `items[].title`
- Cache with 5-minute refresh interval
- Env var: `ARYEO_API_KEY`

#### 7 Tiers (NO Deluxe, NO Basic, NO Luxury)

| Tier | Target | Auto-Select When |
|------|--------|------------------|
| Studio | ~35 | 0-1 beds |
| 2/2 | ~38 | 2 bed, 2 bath |
| 3/2 | ~40 | 3 bed, 2 bath |
| 4/3 | ~42 | 4 bed, 3 bath |
| 5/3 | ~45 | 5 bed, 3 bath |
| 5/4 | ~48 | 5 bed, 4 bath |
| 6/5 | ~52 | 6+ bed, 5+ bath |

The tier data in `lib/data/tier-info.ts` and `lib/data/room-templates.ts` must be updated to match these 7 tiers exactly. Remove any references to Deluxe, Basic, Luxury, or other tier names.

#### Dual-Mode Architecture
- **Room Tracker** (Nick): Category nav bar (EXT|LIV|KIT|BED|MISC|TWI), room cards with +/- counters, per-room notes, always-visible Complete button
- **Quick Count** (Jared): Giant shot counter, full-width + button, smaller - button, centered target row, SVG progress ring, room chips (tap to mark done/undo — NO 3-state cycle)
- Both modes share the same state object via `useShoot` hook
- Mode sync: switching preserves all data. Room Tracker → Quick Count: total = sum of actuals. Quick Count → Room Tracker: quickCountTotal preserved.

#### Room Chip Behavior (Quick Count)
- Single tap: mark done (green bg, green border, green text)
- Tap again: undo (back to neutral)
- NO 3-state cycling (no "skipped" state from tapping)

#### Complete Shoot Button
- **Always visible** at bottom of both Room Tracker and Quick Count (not hidden until 80%)
- Default: dark (neutral-900 bg, white text) — "Complete Shoot"
- When target reached OR 80% rooms done: green (success-500 bg) — "✓ Complete Shoot"

#### Timer Screen
- Full Toggl aesthetic with dark background (#1A1A2E)
- Large SVG ring (200px+) with pink (#E57CD8) progress stroke and clock tick marks
- "Recording" label with blinking dot when active
- Start/End time controls with ‹/› arrows (5-min increments) + click-to-type
- Arrow buttons: w-7 h-7, rounded-lg, #3D3D5C bg, flex-shrink-0
- Time display: mono font, min-width 4.5rem, centered
- Container uses mx-3 margin to prevent edge clipping
- Single Start/Stop button (pink bg, full width)
- **NO Pomodoro tab** — timer is a single unified screen

#### Agent Contact
- On appointment cards: initials avatar + name + green call button (tel:) + purple SMS button (sms:)
- Both buttons use `event.stopPropagation()` so tapping doesn't navigate into the shoot
- On tier confirmation: larger format with brokerage name

#### Shooter Filter
- Pill buttons at top: All | Nick | Jared | Ben
- Each with color-coded avatar circle
- Filter uses `data-shooter` attribute on cards
- Updates visible appointment count
- Cancelled appointments respect the filter

#### Cancelled Appointments
- Dimmed (opacity-60), strikethrough address, red "Cancelled" badge
- Non-clickable (div not button)
- Shooter badge still visible but dimmed
- No call/SMS buttons

#### Date Navigation
- ‹/› arrows navigate one day at a time
- Format: "Thursday, Mar 6"
- "Jump to Today" link when viewing non-today date

#### Dropbox Auto HDR
- Folder syntax: `AutoHDR/{order#} - {agent_name} - {address}/01-RAW-Photos/`
- Create on shoot start via Trigger.dev background task
- Order number as unique key — check before creating
- Never auto-delete on cancellation
- Show exact folder path on completion screen with Dropbox link

#### Supabase Database
Create 3 new tables: `shoot_sessions`, `shoot_rooms`, `shoot_attachments`. The full SQL schemas are in the spec. Key points:
- `aryeo_order_number` is the unique key on `shoot_sessions`
- Denormalize property + agent data from Aryeo (don't rely on Aryeo for historical data)
- Use `gen_random_uuid()` for IDs
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

#### State Management
Use the existing `useShoot` hook pattern but extend it significantly:

```typescript
interface ShootState {
  shots: number;
  target: number;
  rooms: Room[];
  timerOn: boolean;
  timerSec: number;
  timerInt: NodeJS.Timeout | null;
  mode: 'detail' | 'quick';
  startMin: number;
  notes: Record<string, string>;
  aryeoOrderNumber: string;
  address: string;
  tier: string;
  photographerId: string;
  agentName: string;
  agentPhone: string;
  dropboxFolderPath: string;
}
```

Back state with localStorage (offline-first) + background sync to Supabase.

#### Completion Screen
- Confetti CSS animation on load
- Stats cards: Shots / Target / Variance
- Duration editor: click-to-type with ▲/▼ arrows (5-min increments), `dur-input` class (2ch wide, tabular-nums)
- Skipped rooms warning (amber card) with "go back and shoot these" link
- Attachments: drone photos + lot line upload to Supabase Storage
- Dropbox folder path display with green "auto-created" indicator
- Global notes textarea + per-room notes summary
- Save & Email button → sends via `/api/shoots/:id/email-summary` using Resend

---

## Implementation Phases

### Phase 1: Core (Do First)
1. Set up Tailwind 4 color tokens matching the design system
2. Aryeo appointment API route + appointment list with date nav
3. Shooter filter bar + shooter badges on cards
4. Agent contact info (call/SMS with stopPropagation)
5. Cancelled appointment rendering
6. Tier confirmation screen with 7 tiers + auto-selection
7. Room Setup screen
8. Quick Count mode (big clicker + room chips + SVG ring)
9. Room Tracker mode (category nav + room cards + always-visible Complete)

### Phase 2: Integration
10. Toggl-style timer screen (dark theme, SVG ring, start/stop)
11. Supabase tables + persistence hooks
12. Dropbox folder creation via Trigger.dev
13. Completion screen with all features
14. Mode switching with state sync
15. Email summary via Resend

### Phase 3: Polish
16. File uploads (drone, lot lines)
17. Per-room notes
18. Offline-first with background sync
19. PWA manifest + service worker
20. Haptic feedback + sound effects

---

## Important Constraints

1. **Mobile-first.** This app is used one-handed in direct sunlight. Every tap target must be at minimum 48px. Font sizes must be readable outdoors.
2. **Match the mockup exactly.** The `v2-mockup.html` file is the approved design. Colors, spacing, border radius, font sizes, layout — match them pixel-for-pixel.
3. **Tailwind 4 syntax.** Use `@import "tailwindcss"` not `@tailwind`. Custom colors go in `globals.css` as `@theme` declarations.
4. **No unnecessary dependencies.** The app already has lucide-react and @heroicons/react for icons. Don't add icon libraries. Use SVG directly for the timer ring and progress indicators (see mockup for exact SVG code).
5. **stopPropagation pattern.** Any action button inside a clickable card (call, SMS, notes, timer) must use `event.stopPropagation()` to prevent the card's click handler from firing.
6. **Order number is the unique key.** Not Aryeo UUID, not appointment ID. The order `number` field (e.g., "2178") is what ties everything together — Supabase records, Dropbox folders, and deduplication.
7. **No Pomodoro.** The timer is a single unified screen. No tabs, no Pomodoro mode.
8. **Room chips: 2-state only.** Tap = done (green). Tap again = undo. No "skipped" from tapping.
9. **Complete Shoot always visible.** Both modes show it at all times, not just after 80%.

---

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ARYEO_API_KEY=
DROPBOX_ACCESS_TOKEN=
RESEND_API_KEY=
TRIGGER_DEV_API_KEY=
```

---

## How to Start

1. Check out the `feature/v2-redesign` branch
2. Read the full spec at `docs/323-Media-Shoot-Tracker-v2-Spec.md`
3. Open `docs/v2-mockup.html` in a browser to see all 7 screens
4. Start with Phase 1, item 1: Set up the Tailwind color tokens
5. Build each screen one at a time, constantly comparing against the mockup
6. Test on a mobile viewport (375px wide) throughout — this is a phone app

The mockup HTML contains all the CSS classes, colors, spacing, and JavaScript logic. Use it as your source of truth for every UI decision.
