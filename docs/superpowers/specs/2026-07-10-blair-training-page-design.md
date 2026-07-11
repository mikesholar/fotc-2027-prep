# Blair's Training Page — Design

**Date:** 2026-07-10
**Status:** Approved (design) — pending implementation plan
**Author:** Mike + Claude

## Summary

Add a second athlete, **Blair**, to the FOTC 2027 prep app as an *additive* feature.
Blair competes in the **Novice** division and trains alongside Mike with the same
movements but lighter maxes. Her page reuses Mike's exact 26-week daily sessions,
resolves every percentage load against **her** 1-rep maxes, and adds a new **Skills**
screen that coaches the three movements she has not yet mastered, framed against the
**Qualifier** (block B3, weeks 11–15).

The whole thing is delivered from the **same deployed page**, with the athlete chosen
by a URL query parameter. **Mike's plan, storage, title, routes, and deploy workflow
are unchanged** — this is strictly in addition.

## Goals

- Give Blair a URL she can open like Mike opens his, showing her own numbers.
- Focus her training on her ability gaps and prepare her for the Qualifier.
- Keep Mike's existing experience byte-for-behavior identical.
- Structure the work so **Erik** can be added later as a third athlete config with no
  new architecture.

## Non-Goals

- Authoring new Novice-specific programming. Blair follows Mike's sessions verbatim;
  only her maxes and a gap-skills layer differ.
- Per-day injected gap work. Gap coaching lives on one dedicated Skills screen.
- Erik's page (his assessment column in `blair.xlsx` is empty). Handled independently later.
- Any change to Mike's plan data, storage key, or hosting.

## Source Data

`blair.xlsx` is a single sheet, "Training Answers": a movement-readiness checklist for
the Novice and Intermediate divisions, with Erik and Blair columns. It is **not** a plan.

Blair's **Novice** column (movement + "Have?") yields, verified from the file:

- **9 solid** (Yes): 2×20# DB, 45# Thruster, Clean 95#, Snatch 55# for reps,
  Shoulder-to-OH 65#, Deadlift 125#, Single Unders, 10# Wall ball, Front Squat 55#.
- **3 gaps**: Knee-to-chest (**Some**), Pull-ups (**No**), Wall walk (**No**).

The gap set drives the Skills screen. The benchmark loads are division standards, not
1RMs, so they are **not** used as her maxes.

## Blair's Maxes (real 1RMs, provided by Mike)

| Lift | Max (lb) |
|------|----------|
| Back Squat | 205 |
| Front Squat | 150 |
| Bench Press | 125 |
| Strict Press | 100 |
| Deadlift | 215 |
| Clean & Jerk | 135 |
| Snatch | 110 |

These ship as her default ("example") maxes. Unlike Mike's example data, Blair's Clean &
Jerk and Snatch are real numbers, so **her lifts carry no "Estimate · test Wk 20" flag**.

## Architecture

### One page, athlete selected by URL

A single `dist/index.html` bundles both athletes' data. The app resolves the active
athlete from `window.location.search`:

- `…/index.html` (no param) → **Mike**: his `plan.json`, `fotc.maxes` key, his title.
  Identical to today.
- `…/index.html?athlete=blair` → **Blair**: her composed plan, `fotc.maxes.blair` key,
  her title.
- Unknown/missing value → defaults to **Mike**.

The query string is untouched by hash navigation (`#/day/…`, `#/maxes`, `#/schedule`,
`#/skills`), so the whole session stays on the selected athlete. `deploy.yml` needs no
change — it still uploads one `dist/`.

### Athlete registry (new)

A small module (e.g. `src/data/athletes.ts`) defines the athlete list and composes each
athlete's `Plan`:

```
type AthleteId = "mike" | "blair";
type Athlete = {
  id: AthleteId;
  name: string;          // "Blair"
  title: string;         // document/app title, e.g. "FOTC 2027 · Blair"
  storageKey: string;    // "fotc.maxes" | "fotc.maxes.blair"
  plan: Plan;            // parsed & composed
};
```

- **Mike** = `parsePlan(planJson)` verbatim, key `fotc.maxes`, title unchanged.
- **Blair** = compose Mike's `days` + Mike's lift *names* (with `isEstimate: false`)
  with Blair's `defaultMaxes` and `skills` and `qualifierBlock`. This reuses Mike's
  sessions as the single source of truth — no duplicated day JSON.

A pure `selectAthlete(search: string): AthleteId` maps the query string to an athlete
(default Mike), and is unit-tested.

### Blair's data artifact (generated)

`scripts/build-blair.py` reads `blair.xlsx` (Novice "BLAIR EDIT / Have?" columns) plus
Blair's maxes and emits `src/data/blair.json`:

```
{
  "defaultMaxes": { backSquat, frontSquat, bench, strictPress, deadlift, cleanJerk, snatch },
  "skills": [ { movement, status, progression: [..], cue? }, ... ],  // Some/No only
  "solidCount": 9,
  "qualifierBlock": "B3 Qualifier"
}
```

The gap → progression mapping (below) is authored in the script. Re-runnable via a new
`npm run extract:blair`; ready to be pointed at Erik's column later.

### Storage isolation

localStorage is per-**origin**, not per-path, so a shared page must key maxes per
athlete. `loadMaxes`/`saveMaxes` gain a `key` parameter. Mike passes `fotc.maxes`
(unchanged behavior); Blair passes `fotc.maxes.blair`. Neither reads the other's numbers.

## Skills Screen (new)

- Route `#/skills`; a `renderSkillsScreen(plan)` view; a "Skills →" nav link that
  appears **only when `plan.skills` is present**. Mike's plan has no `skills`, so his
  page never shows the screen or the link.
- Header: title "Skills"; sub "Close these before the Qualifier — Week 11. Work
  2–3×/week before class."
- One card per gap movement: name, a status chip (**No** = "Not yet", **Some** =
  "Building"), and a vertical progression ladder. A footer note: "✓ 9 of 12 Novice
  movements already solid."

Proposed progressions (approved, revisable):

- **Pull-ups** (Not yet): Ring rows 3–4×8–10 → Banded pull-ups → Negatives 3–5s →
  Kip swing → Kipping pull-up. Cue: "Slot into warm-up on pull days."
- **Wall walk** (Not yet): Incline shoulder taps → Partial wall walk (¾) →
  Full wall walk, nose to wall.
- **Toes-to-bar** (Building; from "Knee-to-chest"): Hanging knee raise → Knee-to-elbow →
  Toes-to-bar.

## Qualifier Emphasis

Driven by Blair's `qualifierBlock` field. On her Schedule, the matching block's week
heads get a 🎯 "Qualifier" marker; the Skills screen headline names the Qualifier as the
deadline. Mike's plan has no `qualifierBlock`, so his Schedule is unaffected.

## Schema Changes (additive, optional)

`PlanSchema` gains optional fields so Mike's plan still parses unchanged:

- `skills?: Array<{ movement: string; status: "No" | "Some"; progression: string[]; cue?: string }>`
- `solidCount?: number`
- `qualifierBlock?: string`

A new `SkillsScreen` route is added to the router union.

## Data Flow

```
blair.xlsx ─┐
Blair 1RMs ─┴─> build-blair.py ─> src/data/blair.json ─┐
                                                        ├─> athletes.ts composes Blair's Plan
FOTC workbook ─> extract-plan.py ─> src/data/plan.json ─┘   (Mike's days + lifts)
                                                        │
window.location.search ─> selectAthlete() ─> active Athlete ─> app renders
   day / schedule / maxes / skills against that athlete's maxes + storage key
```

## Testing (TDD)

**TypeScript (Vitest):**

- `selectAthlete`: default → mike; `?athlete=blair` → blair; unknown → mike.
- maxes-store key isolation: save under `fotc.maxes.blair` does not change what
  `fotc.maxes` returns, and vice-versa; round-trips per key.
- schema: a plan **with** `skills`/`qualifierBlock`/`solidCount` parses; a plan
  **without** them (Mike's) parses unchanged.
- Skills screen: renders one card per gap with movement, status chip text, and each
  progression step; renders nothing / no nav link when `skills` is absent.
- app smoke: `?athlete=blair` mounts Blair's title/plan; no param mounts Mike's.
- guard: Mike's composed plan `defaultMaxes` and storage key are unchanged; Mike's plan
  has no `skills`.

**Python (pytest):**

- `build-blair` derives gaps = exactly {Knee-to-chest: Some, Pull-ups: No, Wall walk:
  No} from the Novice column, `solidCount == 9`, and all 7 Blair maxes present.
- correctness gate: recompute a sample of percentage loads under Blair's maxes with
  round-half-up and assert they match `round5(pct × max)` — mirroring the existing
  `test_extract.py` gate.

## What Stays Untouched (guaranteed)

`src/data/plan.json`, the `fotc.maxes` key, Mike's title, his routes/screens output,
and `.github/workflows/deploy.yml`. Shared modules (`app.ts`, `main.ts`,
`maxes-store.ts`, `schema.ts`, `router.ts`) are refactored to be athlete-parameterized,
but Mike's default path reproduces today's behavior exactly, enforced by the guard tests
above.

## Rollout

1. `npm run extract:blair` generates `src/data/blair.json`.
2. `npm run build` produces one `dist/index.html` serving both athletes.
3. Existing GitHub Pages deploy publishes it. Blair's URL = the site URL + `?athlete=blair`.
