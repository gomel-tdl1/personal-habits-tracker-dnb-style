# Habits Tracker Implementation Plan

> Executed inline in the authoring session. Steps use checkbox syntax for tracking.

**Goal:** Personal habit tracker with a tracker constructor, dashboard constructor and DnB-style audiovisual feedback.

**Architecture:** Client-rendered Next.js 16 app. Data access goes through a `Repo` interface with two implementations (Supabase, localStorage demo). TanStack Query caches trackers, a 400-day entries window and widgets; mutations are optimistic. Pure domain logic lives in `lib/dates` and `lib/habits` and is unit tested.

**Tech Stack:** Next.js 16.3, React 19.2, Tailwind 4, motion 13, @supabase/ssr 0.12, @dnd-kit, TanStack Query 5, Vitest 5, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-15-habits-tracker-design.md`

## Global Constraints

- Works at 375px phone width and on desktop; tap targets ≥ 44px; safe-area insets respected.
- Dark-only "Main stage" palette and Tektur/Onest fonts from the spec.
- Every user-visible string goes through the RU/EN dictionary.
- `prefers-reduced-motion` respected.
- RLS on all tables; no service keys in the client.

---

### Task 1: Domain logic (TDD)
**Files:** `src/lib/types.ts`, `src/lib/dates.ts`, `src/lib/habits.ts`, `src/lib/*.test.ts`, `vitest.config.ts`
**Produces:** `toKey(d)`, `fromKey(k)`, `addDays(k,n)`, `isoWeekday(k)`, `rangeKeys(from,to)`; `isScheduled(t,k)`, `isDone(t,v)`, `progress(t,v)`, `currentStreak(t,map,today)`, `bestStreak(t,map,today)`, `completion(ts,map,from,to,today)`, `dayScore(ts,map,k)`; `EntryMap = Map<string, number>` keyed `${trackerId}:${date}`.
- [x] Write failing tests for dates and habits
- [x] Implement, run `pnpm test`, all pass

### Task 2: Data layer
**Files:** `supabase/migrations/001_init.sql`, `src/lib/repo/{types,supabase,demo,index}.ts`, `src/lib/supabase/{env,client}.ts`, `src/proxy.ts`, `src/lib/queries.ts`
**Produces:** `Repo` interface; hooks `useTrackers()`, `useEntries()`, `useWidgets()`, `useSetEntry()`, `useSaveTracker()`, `useDeleteTracker()`, `useReorderTrackers()`, `useSaveWidget()`, `useDeleteWidget()`, `useReorderWidgets()`.
- [x] SQL schema + RLS
- [x] Repo implementations + query hooks with optimistic updates
- [x] Proxy with session refresh and redirect

### Task 3: Shell, theme, i18n, sound engine
**Files:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/providers.tsx`, `src/lib/i18n/*`, `src/lib/sound/engine.ts`, `src/lib/sound/useSound.ts`, `src/components/shell/*`, `src/components/ui/*`, `src/app/login/page.tsx`
- [x] Tokens, fonts, providers, nav (bottom bar / rail), login
- [x] Web Audio DnB engine: stab, pluck, reese, riser+sub drop, tape stop, full drop

### Task 4: Today screen
**Files:** `src/app/(app)/page.tsx`, `src/components/today/*`, `src/components/fx/*`
- [x] Day header + swipe, drop meter, cards per type, shockwave/laser FX, presets

### Task 5: Trackers screen
**Files:** `src/app/(app)/trackers/page.tsx`, `src/components/trackers/*`
- [x] Sortable list, editor sheet, archive/delete

### Task 6: Dashboard
**Files:** `src/app/(app)/dashboard/page.tsx`, `src/components/dashboard/*`
- [x] Sortable widget grid, add/edit sheet, heatmap, daily chart, streak, completion

### Task 7: Verify and document
- [x] `pnpm test`, `pnpm lint`, `pnpm build`
- [x] Run in demo mode, screenshots at 390px and 1440px
- [x] README with Supabase + Vercel setup
