# Shoot Tracker v2 — Hotfix Spec (FAANG Workflow)

**Status:** Draft v1
**Owner:** Nick (323 Media)
**Date:** 2026-04-07
**Parent Spec:** `docs/323-Media-Shoot-Tracker-v2-Spec.md`
**Workflow Standard:** `Claude-Code-FAANG-Workflow-Cheat-Sheet` (spec-first, tests-first, phase-gated, spec-verifier ≥95%)

---

## 1. Problem Statement

Field photographers (Nick, Jared, Ben) report the app is unreliable and painful to use one-handed in sunlight. Five confirmed P0/P1 defects and one UX anti-pattern are blocking daily use:

1. **Autosave/Resume broken** — backing out of the PWA loses shoot state; tapping an appointment re-starts a clobbering shoot instead of resuming.
2. **Timer reports ~9 min for a 2-hour shoot** — `setInterval` counter is throttled on backgrounded iOS Safari PWA tabs.
3. **Dropbox returns 400 on day 2+** — stale cached access token and unsanitized path characters; no 400→refresh retry.
4. **Completion screen has "Start New Shoot" destructive CTA** — one mis-tap nukes the active shoot.
5. **Email summary missing Dropbox link + attachments** — wiring incomplete.
6. **Supabase `shoot-attachments` storage bucket missing** — drone uploads silently fail.

Additional requested improvements (P1/P2):
- Toggl integration must be source of truth for duration and must auto-tag the entry with the current photographer (Nick / Jared / Ben) regardless of which device started it.
- "Deck" and "Covered Porch" must be present in Room Setup quick-add list (Deck exists; **Covered Porch is missing** — only "Screened Porch" exists today).
- One-tap add/remove of a Bed or Bath from Room Tracker must be immediately discoverable.
- Overall app UX score + top-tier design/engineering recommendations.

---

## 2. Success Criteria (Machine-Readable)

Each item below uses the FAANG cheat-sheet verb prefixes: `FILE`, `VERIFY`, `API`, `DB`, `UI`, `WIRE`, `TEST`, `PROCESS`.

### Phase 1 — Autosave & Resume (P0)

1. `FILE` `app/page.tsx` — on mount, if `useShoot().shoot?.status === 'active'`, auto-route to the last-used in-shoot screen (`roomTracker` default) instead of `appointments`.
2. `FILE` `app/page.tsx` — when on the Appointments screen with an active shoot, render a sticky top banner: `⏱ Resume [address]` tappable, height ≥56 px, `bg-primary-500`.
3. `FILE` `lib/hooks/useShoot.ts` — `startShoot(order)` must: (a) if `shoot.status === 'active'` and `shoot.aryeoOrderId === order.id`, return existing shoot (resume); (b) if different order, throw `ShootInProgressError` and let UI prompt.
4. `FILE` `lib/hooks/useShoot.ts` — persist `currentScreen` into the `v2-active-shoot` localStorage payload so reloads restore the exact screen.
5. `FILE` `components/screens/RoomSetupScreen.tsx` — add a "Clear All" text button (top-right, `text-error-500`) with confirm dialog; scope: Room Setup only.
6. `FILE` `components/screens/AppointmentsScreen.tsx` — when user taps an appointment whose order ID differs from the active shoot, show a Radix `AlertDialog`: *"You have a shoot in progress at [address]. End it first or resume?"* with `[Resume] [End & Start New] [Cancel]`.
7. `VERIFY` Reload browser mid-shoot → rooms, counts, timer, current screen all preserved.
8. `VERIFY` Backgrounding the PWA for 10+ min then reopening → state preserved, timer accurate (see Phase 2).
9. `TEST` Vitest: `useShoot.startShoot()` guard logic — 3 cases (no active, same order, different order).
10. `PROCESS` sequentialthinking plan before coding.
11. `PROCESS` tests written before implementation.
12. `PROCESS` `npx tsc --noEmit` passes.
13. `PROCESS` spec-verifier audit ≥95% of Phase 1 criteria.
14. `PROCESS` `mcp__qdrant__log_progress` entry for Phase 1.

### Phase 2 — Timer Correctness & Toggl Source of Truth (P0)

1. `FILE` `components/screens/TimerScreen.tsx` — replace `secondsRef.current += 1` with:
   ```ts
   const tick = () => setElapsed(Math.floor((Date.now() - new Date(shoot.startTime!).getTime())/1000));
   ```
   Run on `setInterval(tick, 1000)` AND on `document.visibilitychange` when `!document.hidden`.
2. `FILE` `components/screens/TimerScreen.tsx` — timer display must be **editable**: tapping the HH:MM:SS opens a numeric stepper (Radix Dialog) that writes back a new `startTime` = `Date.now() - newElapsedSeconds*1000`.
3. `FILE` `components/screens/TimerScreen.tsx` — timer auto-starts on entry into the first Room Tracker screen if `!shoot.startTime`. No manual "Start" button required.
4. `FILE` `app/api/toggl/start/route.ts` — POST must include `tags: [photographerName]` where `photographerName` is read from `shoot.photographer` (falls back to Settings → `userName`, then `"Unknown"`).
5. `FILE` `app/api/toggl/stop/route.ts` — return `{ duration, start, stop }` read from Toggl's response body.
6. `WIRE` `CompletionScreen.tsx` — final duration = Toggl `duration`, not local `timerSeconds`; local value is fallback only if Toggl unreachable.
7. `FILE` `lib/hooks/useSettings.ts` — persist `userName` (Nick / Jared / Ben radio selector) in Settings screen.
8. `FILE` `components/screens/SettingsScreen.tsx` — add Photographer radio group (Nick / Jared / Ben), stored via `useSettings`.
9. `TEST` Vitest with mocked `Date.now()`: simulate 2-hour gap with only 9 ticks → elapsed reads 7200s (proves the bug is fixed).
10. `TEST` Integration: POST `/api/toggl/start` with `photographer:"Jared"` → Toggl entry has `tags:["Jared"]`.
11. `VERIFY` Real-device: start shoot, lock iPhone 30 min, reopen → timer shows ≥1800 s.
12. `PROCESS` sequentialthinking plan, tests-first, `tsc --noEmit`, spec-verifier ≥95%, `qdrant__log_progress`.

### Phase 3 — Dropbox 400 Resilience (P0)

1. `FILE` `app/api/dropbox/create-folder/route.ts` — sanitizer must strip `/\\<>:"|?*` and collapse whitespace:
   ```ts
   const sanitize = (s:string)=>s.replace(/[<>:"|?*\\/]/g,'').replace(/\s+/g,' ').trim();
   ```
2. `FILE` same — treat `res.status === 400 || 401` as refreshable: call `refreshAccessToken()` once, retry, then fail loudly.
3. `FILE` same — remove reliance on module-level `cachedAccessToken` across warm invocations; always attempt refresh on cold start when env token is >3h old (store `tokenIssuedAt`).
4. `FILE` same — on any Dropbox error, `console.error` the full response body including `error_summary` and `error['.tag']`.
5. `FILE` same — wrap fetch in helper `dropboxFetch(path, init)` that centralizes retry/refresh/logging.
6. `VERIFY` Trigger folder creation twice 24 h apart in Vercel logs → both succeed, no 400.
7. `TEST` Vitest mocks: stale-token → 400 → refresh → success on retry.
8. `TEST` Vitest: address containing `"123 Main St / Apt 4"` sanitizes to `"123 Main St Apt 4"` and returns 200.
9. `PROCESS` sequentialthinking, tests-first, `tsc --noEmit`, spec-verifier ≥95%, `qdrant__log_progress`.

### Phase 4 — Completion UX & Email Wiring (P1)

1. `FILE` `components/screens/CompletionScreen.tsx` — **remove** "Start New Shoot" button entirely.
2. `FILE` same — primary CTA: `End & Email Summary` (green `bg-success-500`, 64 px tall, full width).
3. `FILE` same — secondary CTA: `Back to Shoot` (outline) — does not clear state.
4. `WIRE` Completion → `POST /api/shoots/[id]/email-summary` payload includes `{ attachmentUrls, dropboxUrl, togglDuration, photographer }`.
5. `FILE` `app/api/shoots/[id]/email-summary/route.ts` — Resend HTML email must render clickable Dropbox link and list attachments as `<a>` tags.
6. `FILE` same — subject line: `[323] Shoot Complete — [address] — [photographer]`.
7. `UI` Empty-state handling: if `attachmentUrls.length === 0`, email omits the attachments section (no empty list).
8. `TEST` Resend sandbox: full end-to-end email contains Dropbox URL + ≥1 attachment link.
9. `PROCESS` sequentialthinking, tests-first, `tsc --noEmit`, spec-verifier ≥95%, `qdrant__log_progress`.

### Phase 5 — Supabase Persistence + Uploads Bucket (P1)

1. `DB` `mcp__supabase-323__apply_migration` — create tables `shoot_sessions`, `shoot_rooms`, `shoot_attachments` per `docs/supabase-tables.sql` (idempotent).
2. `DB` Create storage bucket `shoot-attachments` (private, RLS: owner = auth.uid()).
3. `API` `POST /api/shoots/[id]/attachments` — accepts multipart, writes to bucket, inserts row, returns public signed URL (7 days).
4. `WIRE` Room Tracker "+ Photo" button → uploads to this endpoint → stores returned URL in `shoot.attachmentUrls`.
5. `VERIFY` `mcp__supabase-323__list_tables` shows all three tables.
6. `TEST` Vitest: POST a fixture PNG → row created, URL resolves 200.
7. `PROCESS` sequentialthinking, tests-first, `tsc --noEmit`, spec-verifier ≥95%, `qdrant__log_progress`.

### Phase 6 — Room Catalog & Quick-Add UX (P1)

1. `FILE` `lib/data/quick-add-rooms.ts` — add `{ id: 'covered_porch', name: 'Covered Porch', category: 'exterior' }`. ("Deck" already exists; verified.)
2. `FILE` `components/screens/RoomTrackerScreen.tsx` — persistent footer bar with two chips: `+ Bed` and `+ Bath`. Tapping appends the next-numbered bedroom/bathroom (`Bedroom 7`, `Bathroom 5`, etc.) with zero modal friction.
3. `FILE` same — each room row swipe-left reveals `Remove` (Radix `ContextMenu` or custom swipe) for symmetric one-tap remove.
4. `TEST` Vitest: `+ Bed` pressed 3× from a 2-bed template → rooms list ends with `Bedroom 3`, `Bedroom 4`, `Bedroom 5`.
5. `PROCESS` sequentialthinking, tests-first, `tsc --noEmit`, spec-verifier ≥95%, `qdrant__log_progress`.

---

## 3. Non-Goals

- Rewriting state management (Zustand/Redux) — stay with `useShoot` + localStorage.
- Multi-user real-time collaboration on a single shoot.
- Offline-first conflict resolution beyond "last-write-wins per device".

---

## 4. Rollout & Branching Strategy

This spec lives in the existing `media-shoot-tracker-v2` git worktree (already isolated from `main` in the parent repo at `/Users/Nick/Documents/GitHub/media-shoot-tracker`). Per FAANG isolation standards:

1. **Spec branch:** `hotfix/shoot-tracker-v2-spec` — contains only this spec + the implementation prompt. Open PR immediately for review.
2. **Per-phase branches** (off `main`, not off the spec branch):
   - `hotfix/shoot-tracker-v2-phase-1-autosave`
   - `hotfix/shoot-tracker-v2-phase-2-timer-toggl`
   - `hotfix/shoot-tracker-v2-phase-3-dropbox`
   - `hotfix/shoot-tracker-v2-phase-4-completion-email`
   - `hotfix/shoot-tracker-v2-phase-5-supabase-uploads`
   - `hotfix/shoot-tracker-v2-phase-6-rooms-quickadd`
3. **Release tagging:** Phases 1–3 ship together as `v2.1.0` (all P0). Phases 4–6 ship as `v2.2.0`.
4. Each phase PR gated by spec-verifier ≥95% and an `mcp__qdrant__log_progress` entry before merge.
5. Never commit directly to `main`. Never force-push a phase branch once review has started.

**To create the spec branch in the existing worktree (run on host Mac):**

```bash
cd /Users/Nick/Documents/GitHub/media-shoot-tracker-v2
git switch -c hotfix/shoot-tracker-v2-spec
git add docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md docs/specs/CLAUDE_CODE_IMPLEMENTATION_PROMPT.md
git commit -m "docs(specs): add v2 hotfix spec + Claude Code implementation prompt"
git push -u origin hotfix/shoot-tracker-v2-spec
gh pr create --title "docs: Shoot Tracker v2 hotfix spec" --body "Spec-first hotfix plan per FAANG workflow. See docs/specs/."
```

---

## 5. Current App Score & UX Recommendations

**Overall score: 62 / 100** before hotfix. Breakdown:

- Reliability: 35/100 (timer + autosave + Dropbox are all broken P0s)
- Visual Design: 82/100 (v2 mockup is strong; primary color system, typography, and spacing are solid)
- Information Architecture: 70/100 (screen flow is clear but resume/clobber bug breaks the mental model)
- One-Handed Ergonomics: 75/100 (most targets ≥48 px; Timer editing and bed/bath add are not thumb-reachable)
- Field Usability (sunlight, gloves, speed): 60/100 (contrast OK; too many taps to correct a mis-counted room)
- Delight: 55/100 (minimal feedback on success; no haptics; success animation is buried)

Projected score after Phases 1–6: **91 / 100**.

### Top-tier engineering + UX recommendations (in priority order)

1. **Make time a derived value, never a counter.** Elapsed = `now - startTime`. This single change kills an entire class of iOS PWA bugs.
2. **Autosave must be invisible.** Every mutation → localStorage + (debounced 500 ms) → Supabase. Never show a "Save" button. The FAANG standard is "if the user has to think about saving, you failed."
3. **Kill destructive CTAs on primary flows.** "Start New Shoot" from Completion is a footgun. Resume banner is the iOS "call in progress" pattern — it's industry-proven.
4. **Haptic feedback on every counter increment.** `navigator.vibrate(10)` on tap. Photographers with gloves get instant confirmation without looking.
5. **Big numbers, bigger buttons.** Shot counts at 72 px (not 48). Increment button at 96 px tall, full width. Test in direct noon sunlight on an iPhone 13 mini.
6. **Photographer identity is a setting, not a per-shoot prompt.** Store once in Settings; every Toggl entry, Dropbox folder, and email auto-tags. Zero per-shoot typing.
7. **Sticky "Resume" banner** on Appointments = zero lost work forever. This is the single biggest trust-builder.
8. **Add `+ Bed` / `+ Bath` as a permanent footer bar** on Room Tracker. Bed/bath count changes mid-shoot constantly in real estate — make it one tap, zero modals.
9. **Swipe-to-remove on room rows.** Symmetric to add. Native iOS pattern; photographers already know it.
10. **Optimistic UI everywhere.** Increment the counter locally first, then sync. Never block on the network. Show a small spinner only if sync fails.
11. **Telemetry**: add `@vercel/analytics` + `posthog` events on every screen transition. Without data, UX decisions are guesses.
12. **Offline-first with Service Worker caching** of appointments and current shoot state. Field photographers work in basements with no signal.
13. **A "dry run" mode** that doesn't hit Toggl/Dropbox/Resend — for onboarding new photographers without polluting production.
14. **Error boundaries per screen** with a friendly "Something broke, your shoot is safe, tap to continue" card. Never a blank screen.
15. **CI gate**: Playwright smoke test that walks Appointments → RoomSetup → RoomTracker → Completion end-to-end on every PR.

---

## 6. Phase Audit Template (paste after each phase)

```
Run spec-verifier against docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md Phase {N}.
Required: ≥95% criteria pass.
Then: npx tsc --noEmit && npm run lint && npm run test -- --run.
Then: mcp__qdrant__log_progress { phase: {N}, status: "complete", notes: "<summary>" }.
Report PASS/FAIL per criterion in a table.
```
