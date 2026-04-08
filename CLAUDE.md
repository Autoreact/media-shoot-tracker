# Media Shoot Tracker v2 — CLAUDE.md

**Last Updated:** 2026-03-25

## Project Overview

Media Shoot Tracker v2 is the redesigned mobile-first PWA for 323 Media photographers in Tallahassee, FL. It transforms the original standalone room counter into a connected field tool that syncs with Aryeo (appointments), auto-creates Dropbox folders, tracks time Toggl-style, sends post-shoot email summaries, and supports multi-photographer workflows — all usable one-handed in direct sunlight.

**Read `docs/323-Media-Shoot-Tracker-v2-Spec.md` for the full V2 product spec.**
**Read `v2-mockup.html` — the interactive HTML prototype is the UI source of truth.**

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.x (App Router) |
| React | React | 19.x |
| Language | TypeScript | 5.x (strict mode) |
| CSS | Tailwind CSS | **v4** (CSS-based config via `@theme inline`) |
| UI | Headless UI + Heroicons + Radix UI + Lucide | Latest |
| Database | Supabase (PostgreSQL) | Latest |
| Package Manager | **npm** | (no pnpm-lock.yaml — uses package-lock.json) |
| Hosting | Vercel | media-shoot-tracker.vercel.app |
| Repo | github.com/nick-renaud/media-shoot-tracker | — |

### External APIs

| API | Purpose |
|-----|---------|
| Aryeo REST API | Appointment/order data |
| Supabase | Shoot data persistence, real-time sync |
| Dropbox API | Auto-create shoot folders |
| Resend | Post-shoot email summaries |

## Critical Rules

### Tailwind CSS v4

- Uses CSS-based configuration via `@theme inline` in `app/globals.css`
- Does NOT use `tailwind.config.js` — there is no config file
- Custom colors defined in `@theme inline` block with full shade scales
- Dark mode via `@custom-variant dark (&:is(.dark *))`
- Import: `@import "tailwindcss"` at top of globals.css
- Uses `tw-animate-css` for animation utilities

### Design System — MANDATORY

- **Primary color: `#635BFF`** — NEVER use `blue-*`, `indigo-*`, `purple-*`, `violet-*`
- Use `bg-primary-500`, `text-primary-500` etc. (mapped via `@theme inline`)
- Full shade scales defined: primary-50 through primary-900
- **Success:** `#00D924` | **Warning:** `#FFBB00` | **Error:** `#DF1B41`
- **Neutrals:** `#1F2933` (dark) to `#F6F9FC` (light)
- Timer screen uses separate Toggl-inspired dark palette

### Photographer Color Coding

| Photographer | Color | Token |
|---|---|---|
| Nick | `#635BFF` (purple) | primary |
| Jared | `#FFBB00` (amber) | warning |
| Ben | `#00D924` (green) | success |

### Mobile-First — Non-negotiable

- This is a **field tool used one-handed in sunlight**
- Minimum tap targets: **48px** (primary actions: 56px+)
- Quick Count button: full width, 80px+ tall
- Typography: shot counts 48-64px bold, addresses 17-22px bold
- Font: Inter (Google Fonts)
- Test at 375px width first, always

### Component Libraries

- `shadcn/ui` components in `components/ui/` (Radix UI + class-variance-authority + tailwind-merge)
- Headless UI for other interactive components
- Heroicons + Lucide for icons

## File Structure

```
app/
├── page.tsx                        # Home — appointments screen
├── api/
│   ├── appointments/               # Aryeo appointment sync
│   ├── dropbox/                    # Dropbox folder creation
│   └── shoots/                     # Shoot CRUD
├── layout.tsx                      # Root layout
└── globals.css                     # Tailwind v4 @theme config

components/
├── screens/                        # Full-screen views
│   ├── AppointmentsScreen.tsx      # Home — today's appointments
│   ├── TierConfirmationScreen.tsx  # Confirm property tier
│   ├── RoomSetupScreen.tsx         # Room list setup
│   ├── RoomTrackerScreen.tsx       # Active room tracking
│   ├── QuickCountScreen.tsx        # Quick shot counter
│   ├── TimerScreen.tsx             # Toggl-style timer
│   ├── CompletionScreen.tsx        # Shoot summary
│   ├── ReportsScreen.tsx           # Analytics/reports
│   └── SettingsScreen.tsx          # App settings
├── ui/                             # shadcn/ui base components
├── LoadingSpinner.tsx
├── PageTransition.tsx
└── SuccessAnimation.tsx

lib/
├── data/                           # Room templates, tier data
├── hooks/                          # Custom React hooks
├── supabase.ts                     # Supabase client
├── utils.ts                        # Shared utilities
└── utils/                          # Additional utilities

types/
└── index.ts                        # TypeScript types
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Public anon key
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only

# Aryeo
ARYEO_API_KEY=                      # Aryeo REST API key

# Dropbox
DROPBOX_ACCESS_TOKEN=
DROPBOX_REFRESH_TOKEN=
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=

# Email
RESEND_API_KEY=                     # Post-shoot summary emails

# Trigger.dev (future)
TRIGGER_DEV_API_KEY=
```

## Development Commands

```bash
npm install                         # Install dependencies
npm run dev                         # Start dev server
npm run build                       # Production build
npm run lint                        # ESLint
```

## Screen Flow

```
Appointments → Tier Confirmation → Room Setup → Room Tracker → Completion
                                                    ↕
                                              Quick Count
                                                    ↕
                                                Timer
```

## Key Decisions

1. **Aryeo is the appointment source of truth** — pull from API, don't duplicate
2. **Supabase for shoot persistence** — unlike v1's localStorage-only approach
3. **Screen-based architecture** — each major view is a full-screen component in `components/screens/`
4. **v2-mockup.html is the UI source of truth** — match it pixel-for-pixel
5. **One-handed operation** — every interaction must be thumb-reachable
6. **Sunlight readability** — high contrast, large text, clear status colors
7. **npm (not pnpm)** — this project uses package-lock.json
