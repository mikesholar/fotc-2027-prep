# FOTC 2027 Prep

A phone-first, offline workout app. Enter your 1-rep maxes once and every percentage-based
load resolves into a real weight — so you can follow the day's work in the gym without
opening the spreadsheet.

It serves two plans:

- **Mike** (the default page) runs a **5-day free-weights hypertrophy program** —
  10 weeks, two mesocycles, plus pull-up and toes-to-bar skill ladders.
- **Blair and Erik** (`?athlete=…`) run the **FOTC 2027 26-week prep plan**.

- **View-only.** Follow the plan; nothing to fill in mid-set.
- **Local only.** Your maxes live in the browser's `localStorage`. No account, no server, no database.
- **Shareable.** The whole app is a single self-contained `index.html`. Send it to a training
  partner; they open it, tap **Reset to example maxes**, and enter their own numbers.
- **lb only.** Loads are rounded to the nearest 5 lb, matching the source workbook.

## Screens

- **Day** (`#/day/<date>`) — the day-picker bar moves through the plan; opens to the current
  day on launch. Each part of the session is a labeled box (Prep, Main Lift, Skill,
  Accessory, conditioning/notes). Lifts show a compact table of `sets · % · weight`; on the
  hypertrophy plan every accessory gets its own box in that same layout, minus the weight.
- **Maxes** (`#/maxes`) — seven lift inputs. Editing recalculates every load instantly.
- **Schedule** (`#/schedule`) — every week grouped like the workbook; tap a day to open it.
- **Skills** (`#/skills`) — progression ladders with tickable rungs, for athletes whose
  plan defines them.

## Develop

```bash
npm install
npm run dev        # Vite dev server
npm run test       # Vitest (pure-core + jsdom smoke tests)
npm run build      # type-check + produce dist/index.html
```

The app is TypeScript (strict) with a small pure core (`src/core/` — schema, load math,
current-day selection, maxes store) that holds all logic and is unit-tested, plus a thin
DOM view layer (`src/ui/`). No UI framework.

## The plan data

Both plans are generated once into committed JSON under `src/data/`.

### The hypertrophy plan (Mike's default page)

```bash
npm run extract:hypertrophy    # scripts/build-hypertrophy.py -> src/data/hypertrophy.json
```

Generated from `5-day-hypertrophy-program.md`: 10 weeks from Mon 2026-08-17, two
mesocycles of 4 build weeks plus a deload, rest days included so the day picker walks a
real week.

The source program prescribes rep ranges and reps-in-reserve rather than percentages,
so the generator models double progression literally — **one percentage per lift held
flat across the four build weeks while the rep target climbs** (`4×5 → 4×6 → 4×7 → 4×8`),
a deload at 60% of that weight and half the sets, and a heavier restart next mesocycle.
Barbell Row and Incline Barbell Press have no 1RM of their own, so they're derived from
the deadlift and bench maxes with the basis printed in a note row (see `CLAUDE.md` for
why the lift enum can't just grow).

### The FOTC plan (Blair's and Erik's pages)

```bash
npm run extract    # runs scripts/extract-plan.py (needs Python 3 + openpyxl)
```

The extractor reads `FOTC_2027_26-Week_Prep_Mike-2.xlsx`, splits each day's session into
labeled sections, and derives each day's main lift and its set percentages. A correctness
gate in `tests/test_extract.py` recomputes every percentage-based load from the example
maxes and asserts it matches the value printed in the workbook, so the app reproduces the
sheet's numbers exactly. Re-run `npm run extract` (and the tests) whenever the workbook changes.

## Share it

`npm run build` inlines the JavaScript, CSS, and plan data into one file:

- **Host it:** put `dist/index.html` on any static host (e.g. GitHub Pages) and share the URL.
- **Send it:** AirDrop / text / email `dist/index.html`. The recipient opens it on their phone,
  taps **Reset to example maxes**, enters their own 1RMs, and can "Add to Home Screen" to use
  it offline like an app.

## More athletes (Blair, Erik)

The same page serves more than one athlete, selected by URL:

- **Mike** (default): the site URL as-is — the 5-day hypertrophy program, with **pull-up**
  and **toes-to-bar** ladders on the **Skills** screen and a recurring `Skill` block in the
  day view (toes-to-bar Mon/Fri, pull-ups Thu/Sat, optional hangs Wed).
- **Blair:** append `?athlete=blair` — the FOTC sessions resolved to her own maxes (stored
  separately under `fotc.maxes.blair`), and a **Skills** screen for her gap movements ahead
  of the Qualifier.
- **Erik:** append `?athlete=erik` — the FOTC sessions resolved to his maxes (stored under
  `fotc.maxes.erik`), and a **Skills** screen. Erik competes Novice
  and clears the strength standards, so his skill work centers on his **conditioning engine**
  plus the two Novice skills he only half-owns: **wall walks** and **double-unders**.

Blair's and Erik's data is generated from their `<name>.xlsx` into `src/data/<name>.json`
(committed):

```bash
npm run extract:blair
npm run extract:erik
```

Both pages compose off `plan.json`'s FOTC sessions verbatim; only the maxes, the Skills
screen, and the Qualifier marker differ. To add another athlete later, generate their data
file, pick which plan they compose from, and add an entry to `src/data/athletes.ts`.

## Notes

- The hypertrophy plan doesn't program the Olympic lifts, so Clean & Jerk and Snatch stay
  on the Maxes screen only as a place to keep your numbers. Blair's and Erik's FOTC plan
  tests them in Week 20.
- Each athlete's maxes live under their own `localStorage` key (`fotc.maxes`,
  `fotc.maxes.blair`, `fotc.maxes.erik`); "Reset to example maxes" clears back to that
  plan's defaults. Ticked skill rungs live under the matching `fotc.skills*` key.
