# 323 Media Shoot Tracker — V2 Product Spec

**Author:** Nick Renaud / Claude
**Date:** March 8, 2026
**Status:** Approved for Development
**App:** media-shoot-tracker.vercel.app
**Repo:** github.com/Autoreact/media-shoot-tracker
**Branch:** feature/v2-redesign
**Stack:** Next.js 16 · React 19 · Tailwind 4 · Supabase · Vercel · Aryeo API
**Mockup:** v2-mockup.html (interactive HTML prototype — source of truth for all UI)

---

## Executive Summary

The 323 Media Shoot Tracker is a mobile-first PWA for real estate photographers in Tallahassee, FL. V2 transforms it from a standalone room counter into a connected field tool that syncs with Aryeo (appointment/order management), auto-creates Dropbox folders, tracks time Toggl-style, and supports two distinct photographer workflows — all while being usable one-handed in direct sunlight.

---

## Design System

### Color Palette (Stripe-inspired)

| Token | Hex | Use |
|---|---|---|
| Primary | #635BFF | Buttons, links, active states |
| Success | #00D924 | Completed rooms, positive variance |
| Warning | #FFBB00 | Skipped rooms, vacant badges |
| Error | #DF1B41 | Cancelled appointments, negative variance |
| Neutral | #1F2933 → #F6F9FC | Text hierarchy (950 to 50) |

### Timer Color Palette (Toggl-inspired)

| Token | Hex | Use |
|---|---|---|
| Dark BG | #1A1A2E | Timer screen background |
| Card BG | #2D2D44 | Timer cards/controls |
| Pink Ring | #E57CD8 | Progress ring, accents |
| Muted | #6B6B8D | Labels on dark bg |
| Controls | #3D3D5C | Button backgrounds |

### Photographer Color Coding

| Photographer | Color | Initials |
|---|---|---|
| Nick | Primary #635BFF (purple) | NR |
| Jared | Warning #FFBB00 (amber) | JR |
| Ben | Success #00D924 (green) | BH |

### Typography
- Font: Inter (Google Fonts)
- Shot counts: 48-64px bold
- Addresses: 17-22px bold
- Body: 14-15px
- Labels: 10-11px uppercase tracking-wider

### Tap Targets
- Minimum: 48px for all interactive elements
- Primary actions: 56px+
- Quick Count + button: full width, 80px+ tall

---

## Screen 1: Appointments (Home)

### Data Source
Appointments pull from the **Aryeo REST API** (`GET /v1/orders`), NOT from a local Supabase appointments table.

Key Aryeo fields:
- `number` — Order number (unique key for deduplication)
- `status` — CONFIRMED, CANCELLED, RESCHEDULED
- `appointments[].start_at` — Appointment time
- `appointments[].users[]` — Assigned photographer (first_name, last_name)
- `customer.name` — Real estate agent name
- `customer.phone` — Agent phone
- `customer.email` — Agent email
- `customer_team_membership.customer_team.name` — Brokerage name
- `address.unparsed_address` — Full property address
- `custom_fields` step-3 — SQFT, beds/baths, shoot notes, furnished status
- `items[].title` — Services ordered (Photos, Drone, 3D Tour, etc.)

### Layout Elements

**Header:** User avatar (initials, primary bg) + "Shoots" label + email. Settings gear (top right).

**Date Navigation:** ‹ prev — Date Label — next ›. Format: "Thursday, Mar 6". "Jump to Today" link when viewing another day. Default: today.

**Shooter Filter Bar:** Pill buttons: All | Nick | Jared | Ben. Each has color-coded avatar. Active = primary-500 bg white text. Inactive = neutral-100 bg. Filtering updates shoot count and hides non-matching cards.

**Sync Indicator:** Green dot + "Synced from Aryeo · N shoots"

### Active Appointment Card
- Time badge (primary-50, rounded-lg)
- Shooter badge (color-coded pill with avatar + name)
- Service tags (neutral-100 pills)
- Address (17px bold, primary visual element)
- Property stats: beds · baths | sqft + optional Vacant badge
- Agent contact row: initials avatar + name + green call button (tel:) + purple SMS button (sms:), both with event.stopPropagation()
- Footer: Order number, auto-tier, estimated shots, chevron
- Tap → Tier Confirmation

### Cancelled Appointment Card
- opacity-60, line-through address, red "Cancelled" badge top-right
- Shooter badge dimmed, non-clickable div (not button)
- No agent contact buttons

### Manual Entry
- Dashed border card: "+ Manual Entry"

### Implementation Notes
- Aryeo API with include=items,appointments,customer,address,payments
- Parse custom_fields server-side for bed/bath/sqft
- Check appointments[].users[] for photographer assignment; fall back to device-stored ID
- 5-minute cache refresh
- Order number = unique key (no duplicates on reschedule)

---

## Screen 2: Tier Confirmation

**Back button** → appointments

**Property header:** Address (22px bold) + city/state/zip

**Stats bar** (4 columns): Beds | Baths | Sqft | Status

**Agent Contact Card:** 36px avatar + name + brokerage + order# + call/SMS buttons

**AI Tier Suggestion:** Primary-50 card with logic display

### 7 Tiers (NO Deluxe, NO Basic, NO Luxury)

| Tier | Target |
|---|---|
| Studio | ~35 |
| 2/2 | ~38 |
| 3/2 | ~40 |
| 4/3 | ~42 |
| 5/3 | ~45 |
| 5/4 | ~48 |
| 6/5 | ~52 |

**Auto-Selection:** Based on beds/baths matching.

**Tier pills:** Horizontal wrap, primary-500 active / neutral-100 inactive.

**Mode selector:** Room Tracker vs Quick Count buttons → "Start Shoot" creates Dropbox folder + navigates.

---

## Screen 3: Room Setup

Room checklist derived from tier. Toggle switches. Florida Room NOT in defaults (Quick Add only). Quick Add section for extras. "Looks Good — Start Shooting" button.

---

## Screen 4: Room Tracker (Nick's Mode)

**Category nav:** Sticky scroll: EXT | LIV | KIT | BED | MISC | TWI

**Room cards:** Name (tap to toggle done), +/- counters (56px), expected shots, notes dot.

**Progress footer:** Shots + target + rooms done + variance + timer.

**Complete Shoot button:** Always visible. Dark when incomplete, green when target reached or 80% rooms done.

**Per-room notes:** Expandable text input on each card.

---

## Screen 5: Quick Count (Jared's Mode)

Giant counter (48-64px) → full-width + button (80px+) → centered - button → centered target row → SVG progress ring → room chips (tap to toggle done) → Complete Shoot button.

Mode sync preserves all state between modes.

---

## Screen 6: Timer (Toggl-Style)

Dark theme (#1A1A2E bg). Large SVG ring (200px+) with pink progress (#E57CD8). Clock tick marks. Time display (36px+ mono). "Recording" blink indicator. "I'm working on..." card with address + tier. Start/End time controls (w-7 arrows, flex-shrink-0, mx-3 container, 5-min increments). Start/Stop button (pink bg). NO Pomodoro tab.

---

## Screen 7: Completion

Confetti animation. Stats cards (shots/target/variance). Duration editor (click-to-type + arrows). Skipped rooms warning. File upload buttons. Dropbox Auto HDR path display with "auto-created on shoot start" indicator. Global notes. Save & Email Summary button.

---

## Dropbox Auto HDR Integration

Folder: `AutoHDR/{order#} - {agent_name} - {address}/01-RAW-Photos/`

- Auto-create on shoot start via Trigger.dev
- Order number prevents duplicate creation
- Never auto-delete on cancellation
- Completion screen shows exact path + link

---

## Cancelled/Rescheduled Handling

Cancelled: dimmed, strikethrough, red badge, non-clickable, no contact buttons.
Rescheduled: shown at new time, same order number, same folder.

---

## Date Navigation

‹ › arrows, "Thursday, Mar 6" format, "Jump to Today" link, historical + future viewing.

---

## Agent Contact

Cards: initials avatar + name + call (tel:) + SMS (sms:) with stopPropagation.
Tier screen: larger format with brokerage + order#.
Source: Aryeo customer data.

---

## Shooter Assignment + Filter

Source: Aryeo appointments[].users[] (fallback: manual/device-stored).
Cards: color-coded badge (Nick=purple, Jared=amber, Ben=green).
Filter: pill buttons showing/hiding cards by data-shooter attribute.

---

## Database Schema

### shoot_sessions
Core shoot record with: aryeo_order_number (unique key), photographer, tier, property data (denormalized from Aryeo), agent info, shot counts, time tracking, Dropbox path, notes, status.

### shoot_rooms
Per-room: template_id, name, category, expected/actual shots, orientation, completed, skipped, notes.

### shoot_attachments
Files: type (drone/lot_line/other), storage_path, metadata.

See full SQL CREATE statements in the spec markdown file.

---

## API Routes

- GET /api/appointments — proxy Aryeo, parse, return formatted
- POST /api/shoots — create session + Dropbox folder
- PUT /api/shoots/:id — auto-save updates
- POST /api/shoots/:id/complete — finalize
- POST /api/shoots/:id/email-summary — send via Resend
- POST/GET /api/shoots/:id/attachments — file management

---

## Environment Variables

NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ARYEO_API_KEY, DROPBOX_ACCESS_TOKEN, RESEND_API_KEY, TRIGGER_DEV_API_KEY

---

## Implementation Priority

Phase 1 (Week 1-2): Aryeo feed, shooter filter, agent contact, tiers, Quick Count, Room Tracker
Phase 2 (Week 3-4): Timer, Supabase persistence, Dropbox, completion email, mode sync
Phase 3 (Week 5-6): File uploads, cancelled handling, room notes, haptics, offline
Phase 4 (Future): Reports, settings, dark mode, data enrichment