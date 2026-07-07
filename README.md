# FOTC 2027 Prep

A phone-first, offline workout app for the FOTC 2027 26-week prep plan. Enter your
1-rep maxes once and every percentage-based load across all 26 weeks resolves into a real
weight — so you can follow the day's work in the gym without opening the spreadsheet.

- **View-only.** Follow the plan; nothing to fill in mid-set.
- **Local only.** Your maxes live in the browser's `localStorage`. No account, no server, no database.
- **Shareable.** The whole app is a single self-contained `index.html`. Send it to a training
  partner; they open it, tap **Reset to example maxes**, and enter their own numbers.
- **lb only.** Loads are rounded to the nearest 5 lb, matching the source workbook.

## Screens

- **Day** (`#/day/<date>`) — the day-picker bar moves through the plan; opens to the current
  day on launch. Each part of the session is a labeled box (Prep, Main Lift, Accessory,
  conditioning/notes). The main lift shows a compact table of `sets · % · weight`.
- **Maxes** (`#/maxes`) — seven lift inputs. Editing recalculates every load instantly.
- **Schedule** (`#/schedule`) — every week grouped like the workbook; tap a day to open it.

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

The plan is generated once from the source workbook into `src/data/plan.json` (committed):

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

## Notes

- Clean & Jerk and Snatch maxes are estimates in the example data — retest and update them
  (the plan tests them in Week 20).
- Data stored under the `fotc.maxes` key in `localStorage`; "Reset to example maxes" clears it
  back to the workbook's example numbers.
