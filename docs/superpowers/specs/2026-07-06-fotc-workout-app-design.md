# FOTC 2027 Prep — Workout App Design

**Date:** 2026-07-06
**Status:** Approved design, pre-implementation
**Source data:** `FOTC_2027_26-Week_Prep_Mike-2.xlsx`

## Purpose

Turn the 26-week prep workbook into a simple, phone-first web app so training can be
followed in the gym without opening the spreadsheet. Every load in every session is a
percentage of the athlete's 1-rep maxes; the app resolves those percentages into real
weights from maxes entered on the device. All state is local — no backend, no database.

The app must be shareable with training partners who enter their own maxes without any
customization: the same file works for anyone.

## Non-Goals (v1)

- No results / feedback logging (view-only).
- No Benchmarks tracker, Event History, or Overview notes screens.
- No kg support (workbook is entirely in lb).
- No service worker / no accounts / no sync.

These are deliberately deferred; the data model leaves room to add them later.

## Success Criteria

1. Opening the app with no route lands on the **current day** (today if it is a training
   day; otherwise the next upcoming day; clamped to the plan's first/last day).
2. Entering a set of maxes recalculates every computed load across all weeks, rounded to
   the nearest 5 lb, and the numbers exactly match the workbook for the example maxes.
3. Each part of a day appears in its own clearly labeled box (Prep, Main Lift, Accessory,
   conditioning/notes).
4. The whole app is one self-contained `index.html` that works offline and can also be
   hosted at a URL.

## Architecture Overview

```
xlsx  ──(build-time, once)──►  scripts/extract-plan.py  ──►  src/data/plan.json
                                                                   │
                                                          (Zod-validated at load)
                                                                   ▼
        Pure core (tested)                              Thin DOM view layer
  computeLoad / resolveDay / pickCurrentDay   ◄────────  hash router: #/maxes #/day/<date> #/schedule
        + plan schema + maxes store                             renders 3 screens
```

- **Build-time extraction (Python):** `scripts/extract-plan.py` reads the workbook with
  openpyxl and emits `src/data/plan.json`. openpyxl is already available; the extractor is
  a one-shot data pipeline, not shipped runtime code.
- **Runtime (TypeScript, strict):** a small pure core holds all logic; a thin render layer
  writes DOM. No UI framework — keeps the single-file bundle tiny and offline-friendly.
- **Packaging:** Vite + `vite-plugin-singlefile` → `dist/index.html` with JS, CSS, and
  `plan.json` all inlined. That one file is both the hostable site (GitHub Pages serves a
  single `index.html`) and the file you can AirDrop/text/email.

## Data Model

`plan.json` shape (types derived from a Zod schema; schema is the trust boundary and is
used to validate the embedded data at load):

```ts
type LiftKey =
  | "backSquat" | "frontSquat" | "bench" | "strictPress"
  | "deadlift" | "cleanJerk" | "snatch";

type Plan = {
  lifts: { key: LiftKey; name: string; isEstimate: boolean }[];
  defaultMaxes: Record<LiftKey, number>;   // example maxes from the sheet
  days: Day[];
};

type Day = {
  date: string;          // ISO "2026-07-20"; ramp-in days included
  dow: string;           // "MON"
  dateLabel: string;     // "Mon Jul 20"
  block: string;         // "B1 Base" | ... | "Ramp-In"
  week: number | string; // 1..26, or "R5" for ramp-in
  weekDates: string;     // "Jul 20–26"
  weekFocus: string;     // focus line from the sheet
  sessionTitle: string;  // "Lower A", "Engine", ...
  sections: Section[];
};

type Section =
  | { type: "prep";     label: string; text: string }
  | { type: "mainLift"; label: string; liftKey: LiftKey; sets: SetScheme[] }
  | { type: "text";     label: string; text: string };  // accessory, conditioning, notes

type SetScheme =
  | { scheme: string; pct: number }        // "2×2" @ 0.825  → computed load
  | { scheme: string; note: string };      // "1×1 heavy for the day", "@ 40–50% DL" — no load
```

Runtime load computation:

```
load(pct, max) = round(pct * max / 5) * 5     // nearest 5 lb
```

`resolveDay(day, maxes)` maps each `mainLift` set with a `pct` to a concrete weight; sets
with a `note` render as-is.

### Determining the main lift and verifying correctness

The workbook prints each day's main-lift loads (e.g. `80% → 220 lb · 82.5% → 225 lb`). The
extractor:

1. Parses the set schemes and percentages from the session text's main-lift line.
2. Back-solves which max was used by testing each of the 7 maxes: the lift whose max
   reproduces every printed `(pct → load)` pair under round-to-5 is the day's `liftKey`.
   (This resolves cases like Friday push-press days automatically — whatever max the sheet
   used is what back-solves.)
3. **Correctness gate:** recomputes every load from `defaultMaxes` and asserts it equals
   the sheet's printed value. Any day that fails is reported and hand-fixed (data or
   parser) before shipping. This guarantees the app reproduces the workbook's numbers.

### Section parsing

Session text is split on blank lines into paragraphs. The first line is the `sessionTitle`.
A paragraph beginning with "Prep" becomes a `prep` section; the paragraph naming the main
lift becomes the `mainLift` section; all others become labeled `text` sections. Days that
don't fit the strength template (qualifier "Sharpen" days, simulations, holiday sessions,
conditioning-only days) degrade gracefully to one or more `text` sections — every day is
still a list of labeled boxes.

### Ramp-In

Ramp-In (Jun 9–Jul 19) is stored differently in the sheet (a weekly Mon–Sun template plus
a per-week "dial"). The extractor expands it into dated days by combining the day-of-week
"one thing" with that week's dial + checkpoint, so the app opens to a real day when used
during the ramp-in period. Ramp-in days carry only `text` sections (no computed loads).

## Screens & Routing

Hash router so the browser back button works and days are deep-linkable:

- `#/maxes` — **Setup.** Seven lift inputs prefilled from `defaultMaxes` (or saved values).
  Editing writes to localStorage immediately and recalculates everything. "Reset to example
  maxes" restores defaults. C&J and Snatch show an "estimate — test Wk 20" flag.
- `#/day/<date>` — **Day view.** Day-picker bar (‹ prev / `Mon · Jul 20` · `B1 Base · Week 1`
  / next ›), a "Today" chip when applicable, session title, then the day's sections as boxes.
  Main-lift box uses the compact table (Layout A): `scheme · % · load`.
- `#/schedule` — **Schedule.** All weeks grouped like the sheet: week header (number, dates,
  block), focus line, then each day as a tappable row (dow/date, session, main-lift focus).
  Today's row highlighted.

No route on load → compute current day → replace route with `#/day/<currentDate>`.

## State & Storage

- **Maxes:** `localStorage["fotc.maxes"]` = `Record<LiftKey, number>`. Missing/invalid →
  fall back to `defaultMaxes`. Validated on read.
- **Current screen:** URL hash only (no persisted navigation state).

## Testing Strategy

TDD on the pure core (Vitest), testing behavior through the public API:

- `computeLoad` — rounding to nearest 5 at boundary cases (e.g. .5 rounding).
- `resolveDay` — pct sets become correct weights; note sets pass through unchanged;
  conditioning days yield no loads.
- `pickCurrentDay` — today is a training day; today is a rest day (picks next upcoming);
  before plan start; after plan end (clamps).
- Plan schema — `plan.json` parses and validates; rejects malformed data.

The extractor's correctness gate (loads match the sheet for example maxes) is itself an
automated check run at build/extract time and acts as an end-to-end guard on the data.

The thin DOM render layer is kept logic-light so behavior lives in tested functions.

## Build & Distribution

- `npm run dev` — Vite dev server.
- `npm run test` — Vitest.
- `npm run build` — static `dist/` **and** a single self-contained `dist/index.html`
  (all assets + `plan.json` inlined). Host `dist/index.html` on GitHub Pages; or send the
  file directly — recipients open it, add to home screen, enter their own maxes.
- Regenerate data with `python3 scripts/extract-plan.py` if the workbook changes; the
  generated `src/data/plan.json` is committed.

## Open Risks

- **Section parsing variety:** later blocks (qualifier, champ-prep sims, holiday weeks) are
  worded more freely than B1. Mitigation: graceful degradation to labeled `text` boxes, and
  the main-lift correctness gate catches any mis-identified lift.
- **Ramp-In modeling:** expanding a weekly template into dated days is a judgment call;
  kept intentionally simple (text-only) to avoid over-engineering a pre-plan garnish.
