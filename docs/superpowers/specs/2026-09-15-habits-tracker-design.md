# Habits Tracker — Design

Personal single-user habit tracker. Deployed to Vercel, data in Supabase.

## Goals

- Build daily habits (not tasks) with a constructor of trackers.
- Dashboard constructor: pick widgets and trackers, see statistics.
- Equally usable on phone and desktop (the user switches between them daily).
- Marking a habit must feel rewarding: drum & bass sound design + wave/laser animation.

## Stack

- Next.js 16 (App Router, `src/`, `proxy.ts`), TypeScript, Tailwind v4.
- Supabase Postgres + Auth via `@supabase/ssr`. No custom backend; the only server code is `proxy.ts` refreshing the session and redirecting to `/login`.
- `motion` (motion/react) for animation, `@dnd-kit` for reordering, TanStack Query for optimistic updates.
- Charts are hand-written SVG animated with Motion.
- Sound is synthesized with the Web Audio API (no audio files), DnB style.
- i18n: RU/EN dictionary, choice stored in a `locale` cookie and synced to `user_metadata.locale`.

## Auth

- Email + password (`signInWithPassword`). Sign-ups disabled in Supabase; the single user is created in the Supabase dashboard.
- RLS on every table: `user_id = auth.uid()`.
- Dev-only demo mode: when Supabase env vars are absent and `NODE_ENV=development`, data lives in `localStorage` and auth is skipped. Production without env shows a setup message.

## Data model

```
trackers          id, user_id, name, emoji, color (pigment key),
                  type: check | counter | number | time,
                  goal numeric null, goal_op: gte | lte,
                  unit text null, step numeric (counter increment),
                  days smallint[] (ISO 1=Mon..7=Sun, empty = every day),
                  position int, archived_at timestamptz null, created_at

entries           tracker_id, user_id, date (local YYYY-MM-DD), value numeric, updated_at
                  PK (tracker_id, date)
                  check → 1/0, counter → count, number → value, time → minutes after midnight

dashboard_widgets id, user_id, kind: heatmap | daily_chart | streak | completion,
                  tracker_ids uuid[] (empty = all active trackers),
                  period int (7|30|90|365), size: S | M | L, position int, created_at
```

## Domain rules

- **Scheduled:** `days` empty or contains the ISO weekday; and date ≥ tracker creation date.
- **Done:** check → value ≥ 1. counter/number/time with goal → `gte ? value ≥ goal : value ≤ goal`. Without goal: counter → value > 0; number/time → any logged value.
- **Progress (0..1)** for display: check 0/1; gte goal → min(value/goal, 1); lte → done ? 1 : 0; no goal → done ? 1 : 0.
- **Current streak:** walk scheduled days backwards from today; today counts only if done (an unfinished today does not break the streak). Unscheduled days are skipped.
- **Best streak:** longest run of done scheduled days in the loaded window.
- **Completion rate** over a period ending today: done / scheduled; today counts only if done.
- **Multi-tracker day score** (heatmap): done trackers / scheduled trackers for that day.
- Dates use the device's local time. Weeks start on Monday.
- Entries are loaded for the last 400 days in one paginated query; the Today view can navigate within that window.

## Screens

Mobile (<768px): bottom tab bar with safe-area insets, sheets slide up from bottom, 44px+ tap targets, swipe between days. Desktop (≥768px): left rail navigation, sheets become centered dialogs, multi-column grids.

1. **Today** (`/`): date header with prev/next/today, swipe to change day; day progress bar made of one segment per scheduled tracker; cards grid (1 col mobile, 2 md, 3 xl).
   - check: tap the card to toggle; checkmark draws.
   - counter: −/+ buttons, liquid fill rises with progress, notes climb a scale.
   - number: tap to edit inline, numeric keyboard.
   - time: native time input plus a "Now" button.
   - Empty state offers presets: Wake up by 7:00 (time ≤ 07:00), Morning exercise (check), Water (counter ≥ 8 glasses).
2. **Trackers** (`/trackers`): sortable list, create/edit sheet (name, emoji, color, type, goal/op/unit/step, weekday chips), archive/restore, delete with confirmation.
3. **Dashboard** (`/dashboard`): sortable widget grid (2 cols mobile, 4 cols desktop; S=1, M=2, L=full). Edit mode shows drag handles, size toggle, delete. "Add widget" sheet: kind, trackers, period.
   - heatmap: day intensity = day score; 90/365 days.
   - daily_chart: one counter/number/time tracker; bars for counter, line + dots for number/time; dashed goal line.
   - streak: one tracker; current + best.
   - completion: 1+ trackers; overall ring + per-tracker bars.
4. **Login** (`/login`).
Header controls: language RU/EN, sound on/off, sign out.

## Musical feedback — drum & bass (Sub Focus, Grafix, Metrik, Nero)

All sound is synthesized live with Web Audio in F minor at 174 BPM. Motion timings are derived from the beat (1 beat = 345 ms).

- **Check on:** euphoric supersaw chord stab (Grafix/Metrik) + tight snare with short reverb tail. Each tracker has its own chord from an i–VI–III–VII progression (by position), so marking habits in any order plays a progression.
- **Counter +1:** plucked supersaw note climbing the F minor pentatonic scale (glass 1 low → goal high). **−1:** tape-stop pitch dive.
- **Number / time saved:** Nero-style reese bass growl (detuned saws, LFO on low-pass) for one beat.
- **Goal reached:** short white-noise riser → sub-bass drop (sine 110→40 Hz) + chord stab. Visual: sub-bass shockwave rings in tracker color from the tap point, card strobe, spectrum bars jump.
- **Whole day done (the Drop):** 2-bar mini drop — riser, kick+snare two-step at 174 BPM, reese bass, chord stabs. Visual: laser beams sweep across the screen, day meter flashes, "DROP" type slam.
- **Uncheck / clear:** tape-stop down-sweep, no rings.
- Sound toggle persisted in localStorage; `navigator.vibrate` pattern on the beat where supported.
- `prefers-reduced-motion`: rings/lasers/strobes replaced by opacity changes; no screen flashes. Sound still plays unless muted.

## Visual direction: "Main stage"

Dark-only, committed look: a DnB main stage at night — laser beams, LED walls, waveform displays. Not a single neon accent: every tracker is its own laser color, so the stage lights up with the user's habits.

- Base: stage `#07081A`, panel `#10122A`, rig line `#23264A`, text `#EEF0FF`, dim `#8A8FB8`.
- Laser pigments (tracker colors): cyan `#27E8F5`, magenta `#FF2E88`, UV `#8B5CFF`, amber `#FFB020`, red `#FF3B3B`, lime `#B6FF3B`, ice `#5AA9FF`, white `#F2F4FF`.
- Type: Tektur (display, big numbers; condensed width, heavy weight, tabular numerals) and Onest (UI text). Both with Cyrillic.
- Motifs: day progress is a "drop meter" (segmented LED bar per tracker); heatmap reads as a step sequencer; charts use waveform/spectrum styling; subtle idle equalizer on the Today header pulsing at 174 BPM only when the day has activity.
- The bold moment is the tap → drop interaction; lists, forms and dashboard chrome stay quiet.

## Testing

- Vitest unit tests for `lib/dates` and `lib/habits` (scheduled/done/progress/streaks/completion/day score).
- `pnpm build` + lint.
- Manual run in demo mode on mobile and desktop viewports.

## Deliverables

- `supabase/migrations/001_init.sql` (schema + RLS).
- README: Supabase setup, create user, disable sign-ups, env vars, Vercel deploy.
