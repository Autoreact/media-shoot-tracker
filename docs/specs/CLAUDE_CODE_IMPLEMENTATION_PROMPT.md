# Claude Code Implementation Prompt — Shoot Tracker v2 Hotfix

Paste **one phase at a time** into Claude Code. Do not run multiple phases in a single invocation. Each phase must end with the 5 🔒 PROCESS gates before moving on.

**Reference spec:** `docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md`
**Workflow standard:** Claude-Code-FAANG-Workflow-Cheat-Sheet (spec-first, tests-first, phase-gated)

**Branching:** Each phase runs on its own branch off `main` in the existing `media-shoot-tracker-v2` worktree:
`hotfix/shoot-tracker-v2-phase-{N}-{slug}`. Open a PR per phase. Never commit directly to `main`. See §4 of the spec for the full branch list.

---

## Global Preamble (include at the top of every phase prompt)

```
You are working on the 323 Media Shoot Tracker v2 (Next.js 16 / React 19 / Tailwind v4 / Supabase).
Project rules: see CLAUDE.md. Spec: docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md.
Constraints:
- Primary color #635BFF only (no blue/indigo/purple/violet utility classes).
- Mobile-first, 48px+ tap targets, 56px+ primary CTAs.
- npm (not pnpm). Tailwind v4 via @theme inline — no tailwind.config.js.
- No new state library — keep useShoot + localStorage.
Workflow gates (🔒 PROCESS) — run AT THE END of this phase:
  1. sequentialthinking plan before any code change
  2. tests written before implementation
  3. npx tsc --noEmit passes
  4. spec-verifier audit ≥95% of THIS phase's criteria
  5. mcp__qdrant__log_progress entry for this phase
Do not proceed to the next phase.
```

---

## Phase 1 Prompt — Autosave & Resume (P0)

```
{GLOBAL PREAMBLE}

Implement Phase 1 of docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md.

Files to modify:
- app/page.tsx
- lib/hooks/useShoot.ts
- components/screens/AppointmentsScreen.tsx
- components/screens/RoomSetupScreen.tsx

Acceptance criteria: 1.1 through 1.9 in the spec.

Start by reading:
1. app/page.tsx
2. lib/hooks/useShoot.ts
3. components/screens/AppointmentsScreen.tsx
4. components/screens/RoomSetupScreen.tsx

Then write Vitest tests for useShoot.startShoot() guard logic FIRST (3 cases).
Then implement. Then run the 🔒 PROCESS gates.
```

---

## Phase 2 Prompt — Timer + Toggl Truth (P0)

```
{GLOBAL PREAMBLE}

Implement Phase 2 of the hotfix spec (criteria 2.1–2.11).

Files:
- components/screens/TimerScreen.tsx
- app/api/toggl/start/route.ts
- app/api/toggl/stop/route.ts
- components/screens/SettingsScreen.tsx
- lib/hooks/useSettings.ts
- components/screens/CompletionScreen.tsx (wire-up only)

The critical fix: elapsed time MUST be derived from `Date.now() - startTime`, never incremented. Also re-tick on `document.visibilitychange`.

Tests first:
- Vitest mocking Date.now to simulate a 2-hour background gap with only 9 ticks → elapsed === 7200.
- Integration test that POST /api/toggl/start with photographer:"Jared" sets tags:["Jared"].

Then implement. Then 🔒 PROCESS gates.
```

---

## Phase 3 Prompt — Dropbox 400 Resilience (P0)

```
{GLOBAL PREAMBLE}

Implement Phase 3 (criteria 3.1–3.8).

File: app/api/dropbox/create-folder/route.ts
Also create: lib/dropbox/dropboxFetch.ts (centralized retry/refresh/logging helper).

Tests first (Vitest + msw or fetch mock):
- Stale token → 400 → refresh → retry → 200.
- Address "123 Main St / Apt 4" sanitizes correctly and succeeds.
- Full error_summary is logged on unrecoverable failure.

Then implement. Then 🔒 PROCESS gates.
```

---

## Phase 4 Prompt — Completion UX + Email Wiring (P1)

```
{GLOBAL PREAMBLE}

Implement Phase 4 (criteria 4.1–4.8).

Files:
- components/screens/CompletionScreen.tsx (REMOVE "Start New Shoot"; primary = "End & Email Summary")
- app/api/shoots/[id]/email-summary/route.ts

Tests first:
- Resend sandbox end-to-end: email HTML contains Dropbox URL anchor and ≥1 attachment anchor.
- Empty attachmentUrls → email omits attachments section entirely.

Then implement. Then 🔒 PROCESS gates.
```

---

## Phase 5 Prompt — Supabase Tables + Uploads Bucket (P1)

```
{GLOBAL PREAMBLE}

Implement Phase 5 (criteria 5.1–5.6).

Use mcp__supabase-323__apply_migration to create:
- shoot_sessions, shoot_rooms, shoot_attachments tables (idempotent CREATE TABLE IF NOT EXISTS).
- shoot-attachments storage bucket (private, RLS per spec).

Create API route: app/api/shoots/[id]/attachments/route.ts (multipart POST).
Wire Room Tracker "+ Photo" button to upload.

Tests first:
- POST fixture PNG → row created, signed URL resolves 200.

Verify with mcp__supabase-323__list_tables that all three tables exist.
Then 🔒 PROCESS gates.
```

---

## Phase 6 Prompt — Room Catalog + Quick Bed/Bath (P1)

```
{GLOBAL PREAMBLE}

Implement Phase 6 (criteria 6.1–6.4).

Files:
- lib/data/quick-add-rooms.ts (add Covered Porch — Deck already exists, verified)
- components/screens/RoomTrackerScreen.tsx (persistent footer: + Bed / + Bath chips; swipe-to-remove on rows)

Tests first:
- + Bed pressed 3× from a 2-bed template → rooms end with Bedroom 3, 4, 5.
- + Bath pressed from a 2-bath template → Bathroom 3 appears.
- Swipe-left on a room row reveals Remove action.

Then implement. Then 🔒 PROCESS gates.
```

---

## Phase Audit Prompt (paste after EACH phase completes)

```
Run spec-verifier against docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md Phase {N}.
Required: ≥95% of criteria pass.
Report a PASS/FAIL table per criterion.
Then run:
  npx tsc --noEmit
  npm run lint
  npm run test -- --run
Then log progress:
  mcp__qdrant__log_progress { phase: {N}, status: "complete", notes: "<one-paragraph summary of what changed and why>" }
If any criterion fails, STOP and report — do not proceed to Phase {N+1}.
```
