# Mike's Default Plan → 5-Day Hypertrophy — Design

**Date:** 2026-08-15
**Status:** Approved
**Source:** `5-day-hypertrophy-program.md` (repo root)

## Summary

Mike's default page stops serving the FOTC 2027 26-week prep plan and starts serving a
5-day free-weights hypertrophy program, with added toes-to-bar and pull-up skill work.
Blair and Erik keep the FOTC plan unchanged.

Today the FOTC plan lives in `src/data/plan.json` and every athlete reads its `days`.
After this change `plan.json` is the *FOTC* plan (Blair's and Erik's), and Mike reads a
new generated `src/data/hypertrophy.json`.

## Goals

- Mike's day, schedule, and maxes screens render the hypertrophy program.
- Main lifts resolve to real weights from his stored 1RMs, the way the app already works.
- Toes-to-bar and pull-ups get both a tracked progression ladder (Skills screen) and a
  recurring dose inside the daily sessions.
- Blair's and Erik's pages are byte-for-byte unchanged in behavior.

## Non-Goals

- No changes to Blair's or Erik's plans, maxes, skills, or storage keys.
- No new lift keys. `LIFT_KEYS` stays at seven — widening it would make
  `maxes-store`'s schema reject Blair's and Erik's already-stored maxes.
- No logging / set-tracking features. The app stays view-only.

## Calendar

Mon 2026-08-17 → Sun 2026-10-25. 70 dated days, rest days included so the day picker
walks a real week.

| Weeks | Block |
|---|---|
| 1–5 | Meso 1 (weeks 1–4 build, week 5 deload) |
| 6–10 | Meso 2 (weeks 6–9 build, week 10 deload) |

| Day | Session |
|---|---|
| Mon | Lower A — Squat |
| Tue | Upper A — Push |
| Wed | Off — walk & mobility |
| Thu | Upper B — Pull |
| Fri | Lower B — Hinge |
| Sat | Upper C — Delts & Arms |
| Sun | Off — rest |

Section order on a training day: `Prep` → `Main Lift` → `Secondary Lift` (where a second
barbell lift exists) → `Skill` → `Accessory`. Monday additionally carries a `Notes` box
with the week's directive; Sunday carries the weekly fundamentals check.

## Load Model

The source program prescribes rep ranges and reps-in-reserve, not percentages. It is a
double-progression program: **the weight holds while the reps climb.** The generated data
honors that literally.

- Weeks 1–4 of a mesocycle share one percentage per lift. The rep target climbs linearly
  from the bottom to the top of the range: `4×5 → 4×6 → 4×7 → 4×8`.
- RIR rides along in a note row: 2 → 2 → 1–2 → 0–1.
- The deload week uses `pct × 0.6` at half the sets (the doc's "half the sets, ~60% of
  the weight"), bottom of the rep range.
- Meso 2 bumps the percentage by +3.5pp lower body / +2.5pp upper body, which lands
  within a rounding step of the doc's "+10 lb lower, +5 lb upper".

Two lifts have no 1RM of their own and are derived from a related max. The basis is
printed in the note row so the percentage is never ambiguous in the gym.

| Lift | Sets × reps | Basis | Meso 1 pct | Wk 1 load |
|---|---|---|---|---|
| Back Squat | 4 × 5–8 | back squat | 0.730 | 200 lb |
| Bench Press | 4 × 5–8 | bench | 0.730 | 140 lb |
| Overhead Press | 3 × 6–10 | strict press | 0.720 | 95 lb |
| Deadlift | 4 × 3–6 | deadlift | 0.780 | 245 lb |
| Front Squat | 3 × 6–10 | front squat | 0.680 | 155 lb |
| Barbell Row | 4 × 6–10 | **deadlift** | 0.450 | 140 lb |
| Incline Barbell Press | 4 × 6–10 | **bench** | 0.560 | 110 lb |

Accessories carry the doc's sets × reps verbatim on build weeks and halved sets on
deload weeks. They are not load-driven.

## Skills

Two ladders, same `SkillSchema` the other athletes use (`movement`, `status`,
`progression[{move, rx, gate}]`, `cue`).

**Pull-up** (`Some`) — scap pull-ups → eccentrics → strict singles on the minute →
4 × 5 strict → sets of 8–10 → weighted.

**Toes-to-bar** (`No`) — active hang + hollow → strict hanging knee raises → knees to
elbows → straight-leg to 90° → strict toes-to-bar → kipping in rhythm.

Daily dose, as a `Skill` section: toes-to-bar Mon and Fri (replacing the doc's generic
sit-up / plank slots), pull-ups leading Thu and Sat, optional hangs on Wed. The section
says "work your current rung — see Skills →" rather than naming a level, so it stays
correct as rungs get ticked.

## Code Changes

### New: `scripts/build-hypertrophy.py` → `src/data/hypertrophy.json`

Follows the existing generator pattern (`build-blair.py`, `build-erik.py`): a pure
`build_plan()` returning the dict, a `main()` that writes it, and a pytest gate in
`tests/test_build_hypertrophy.py`. The gate recomputes every `expectedLoad` from
`defaultMaxes` and asserts it matches, mirroring `tests/test_extract.py`.

Wired as `npm run extract:hypertrophy`.

### `src/core/schema.ts` — one additive optional field

`skillsNote?: string`. The Skills screen currently hardcodes *"Close these before the
Qualifier — Week 11"*, which is false on a hypertrophy plan. The field defaults to that
string when absent, so Blair and Erik are untouched.

### `src/ui/day-screen.ts` — `MOVEMENT_LABELS`

Add `"Skill"` so the new section renders as a bulleted movement list rather than a prose
box. This is the gotcha already documented in `CLAUDE.md`; that note gets updated.

### `src/data/athletes.ts`

Mike's entry reads `hypertrophy.json`; Blair's and Erik's keep composing off
`plan.json`. Mike's title becomes `5-Day Hypertrophy`. His `lifts` carry
`isEstimate: false` throughout — the "Estimate · test Wk 20" badge pointed at a week the
new plan does not have.

## Testing (TDD)

| Layer | Test |
|---|---|
| Generator | 70 days, correct dows, Mon–Sun session titles |
| Generator | every `expectedLoad` == `round(pct × max / 5) × 5` |
| Generator | pct is flat across weeks 1–4, reps climb bottom → top |
| Generator | deload week halves sets and uses `pct × 0.6` |
| Generator | meso 2 percentages exceed meso 1 for every lift |
| Generator | both skill ladders present, every rung has `rx` and `gate` |
| `schema` | a plan parses with and without `skillsNote` |
| `skills-screen` | renders `plan.skillsNote` when present, the qualifier line when not |
| `day-screen` | a `Skill` section renders as a bulleted list |
| `athletes` | Mike's plan is the hypertrophy plan, with skills and no qualifier block |
| `athletes` | Blair's and Erik's day counts still match `plan.json`, not Mike's |
| `app` | Mike's day view shows a Skills link; `#/skills` renders two cards |

## What Stays Untouched

- `src/data/plan.json`, `blair.json`, `erik.json`
- `LIFT_KEYS`, `maxes-store`, `skills-store`, `loads.ts`, `currentDay.ts`, `router.ts`
- Every storage key: `fotc.maxes`, `fotc.maxes.blair`, `fotc.maxes.erik`, and the
  `fotc.skills*` trio
- Blair's and Erik's titles, qualifier markers, and skill ladders
