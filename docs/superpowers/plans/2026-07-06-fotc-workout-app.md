# FOTC Workout App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A phone-first, view-only web app that renders the 26-week FOTC prep plan and resolves every percentage-based load from maxes entered locally on the device.

**Architecture:** A Python build-time script extracts the workbook into a committed `src/data/plan.json`. A small pure TypeScript core (schema, load math, current-day selection, maxes store) holds all logic and is unit-tested with Vitest. A thin DOM view layer renders three hash-routed screens. Vite + `vite-plugin-singlefile` bundles everything (including the JSON) into one self-contained offline `index.html`.

**Tech Stack:** TypeScript (strict), Vite, Vitest (jsdom env), Zod, `vite-plugin-singlefile`, Python 3 + openpyxl (build-time only).

---

## File Structure

```
package.json            npm scripts + deps
tsconfig.json           strict TS config
vite.config.ts          singlefile plugin, base: './'
vitest.config.ts        jsdom environment
index.html              app shell (#app mount point)
scripts/extract-plan.py workbook -> src/data/plan.json (+ correctness gate)
tests/test_extract.py   pytest invariants on generated plan.json
src/
  data/plan.json        GENERATED, committed
  core/
    schema.ts           Zod Plan schema, derived types, parsePlan()
    loads.ts            computeLoad(), resolveDay()
    currentDay.ts       pickCurrentDay()
    maxes-store.ts      loadMaxes(), saveMaxes() (localStorage)
  ui/
    router.ts           hash router
    maxes-screen.ts     #/maxes
    day-screen.ts       #/day/<date>
    schedule-screen.ts  #/schedule
    app.ts              mount + route dispatch + open-to-current-day
  styles.css
  main.ts               entry: import styles, boot app
test/
  schema.test.ts
  loads.test.ts
  currentDay.test.ts
  maxes-store.test.ts
README.md               build / host / share instructions
```

**Lift keys (used everywhere):** `backSquat`, `frontSquat`, `bench`, `strictPress`, `deadlift`, `cleanJerk`, `snatch`.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "fotc-workout-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "extract": "python3 scripts/extract-plan.py"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.3.0",
    "vite-plugin-singlefile": "^2.0.0",
    "vitest": "^2.0.0",
    "jsdom": "^24.1.0"
  },
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`** (strict, matching CLAUDE.md)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom" },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f1216" />
    <title>FOTC 2027 Prep</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create placeholder `src/main.ts` and `src/styles.css`**

```ts
// src/main.ts
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) app.textContent = "FOTC";
```

```css
/* src/styles.css */
:root { color-scheme: dark; }
body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: #0b0e12; color: #e6e9ee; }
```

- [ ] **Step 7: Install and verify**

Run: `npm install && npm run test`
Expected: install succeeds; Vitest reports "No test files found" (exit 0) — acceptable at this stage.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/main.ts src/styles.css
git commit -m "chore: scaffold vite + typescript + vitest project"
```

---

## Task 2: Extractor — day metadata + raw session text

**Files:**
- Create: `scripts/extract-plan.py`, `tests/test_extract.py`

Reads the 6 block sheets (`B1 Base W1-5` … `B6 Peak W25-26`). Each day row is `[dateLabel, DOW, sessionText, loadCell, results]` under a week-header row `WEEK n · dates — focus`. Emits one JSON object per day with metadata + raw `session` text (sections come in Task 4). Ramp-in comes in Task 5.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_extract.py
import json, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLAN = ROOT / "src" / "data" / "plan.json"

def load_plan():
    subprocess.run(["python3", "scripts/extract-plan.py"], cwd=ROOT, check=True)
    return json.loads(PLAN.read_text())

def test_block_days_have_core_metadata():
    plan = load_plan()
    days = [d for d in plan["days"] if d["block"] != "Ramp-In"]
    # 6 blocks; every day carries required fields and ISO date
    assert len(days) >= 90
    for d in days:
        assert d["date"] and d["date"][4] == "-" and d["date"][7] == "-"
        assert d["dow"] in {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"}
        assert d["sessionTitle"]
        assert isinstance(d["week"], int)
        assert d["weekFocus"] is not None

def test_days_are_date_sorted():
    plan = load_plan()
    dates = [d["date"] for d in plan["days"]]
    assert dates == sorted(dates)
```

- [ ] **Step 2: Run to verify it fails**

Run: `python3 -m pytest tests/test_extract.py -q`
Expected: FAIL (script/plan.json does not exist yet).

- [ ] **Step 3: Implement metadata extraction**

```python
# scripts/extract-plan.py
import json, re, pathlib, datetime
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
XLSX = ROOT / "FOTC_2027_26-Week_Prep_Mike-2.xlsx"
OUT = ROOT / "src" / "data" / "plan.json"

BLOCK_SHEETS = [
    "B1 Base W1-5", "B2 Build W6-10", "B3 Qualifier W11-15",
    "B4 Rebuild W16-20", "B5 Champ Prep W21-24", "B6 Peak W25-26",
]
BLOCK_LABEL = {s: s.split(" W")[0].replace("B1", "B1 Base").split("  ")[0] for s in BLOCK_SHEETS}
# Simpler explicit labels:
BLOCK_LABEL = {
    "B1 Base W1-5": "B1 Base", "B2 Build W6-10": "B2 Build",
    "B3 Qualifier W11-15": "B3 Qualifier", "B4 Rebuild W16-20": "B4 Rebuild",
    "B5 Champ Prep W21-24": "B5 Champ Prep", "B6 Peak W25-26": "B6 Peak",
}

DEFAULT_MAXES = {
    "backSquat": 275, "frontSquat": 225, "bench": 195, "strictPress": 135,
    "deadlift": 315, "cleanJerk": 205, "snatch": 145,
}
LIFTS = [
    {"key": "backSquat", "name": "Back Squat", "isEstimate": False},
    {"key": "frontSquat", "name": "Front Squat", "isEstimate": False},
    {"key": "bench", "name": "Bench Press", "isEstimate": False},
    {"key": "strictPress", "name": "Strict Press", "isEstimate": False},
    {"key": "deadlift", "name": "Deadlift", "isEstimate": False},
    {"key": "cleanJerk", "name": "Clean & Jerk", "isEstimate": True},
    {"key": "snatch", "name": "Snatch", "isEstimate": True},
]

MONTHS = {m: i for i, m in enumerate(
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], start=1)}

WEEK_HDR = re.compile(r"WEEK\s+(\d+)\s*·\s*([^—]+?)\s*—\s*(.*)", re.UNICODE)

def parse_date_label(label, plan_year_for_month):
    # label like "Mon Jul 20" ; returns (iso, dow, monthNum)
    m = re.match(r"([A-Za-z]{3})\s+([A-Za-z]{3})\s+(\d+)", label.strip())
    dow, mon, day = m.group(1).upper(), m.group(2), int(m.group(3))
    year = plan_year_for_month(MONTHS[mon])
    iso = datetime.date(year, MONTHS[mon], day).isoformat()
    return iso, dow

def plan_year_for_month(month):
    # Plan runs Jul 2026 -> Jan 2027. Jan-Jun => 2027, Jul-Dec => 2026.
    return 2027 if month <= 6 else 2026

def session_title(text):
    first = text.strip().splitlines()[0].strip()
    # Title is the first line up to any prep/detail; keep it short and Title-Cased.
    first = re.split(r"\s—\s|\s·\s", first)[0]
    return first.title() if first.isupper() else first

def extract_block_days():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    days = []
    for sheet in BLOCK_SHEETS:
        ws = wb[sheet]
        week_num, week_dates, week_focus = None, "", ""
        for row in ws.iter_rows(values_only=True):
            cells = [c for c in row]
            first = cells[0]
            if not any(c is not None for c in cells):
                continue
            if isinstance(first, str) and first.startswith("WEEK "):
                m = WEEK_HDR.match(first)
                if m:
                    week_num = int(m.group(1))
                    week_dates = m.group(2).strip()
                    week_focus = m.group(3).strip()
                continue
            # A day row: col A is a date label "Mon Jul 20", col B is DOW
            if isinstance(first, str) and re.match(r"[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d+", first):
                iso, dow = parse_date_label(first, plan_year_for_month)
                session = (cells[2] or "").strip()
                load_cell = (cells[3] or "") if len(cells) > 3 and cells[3] else ""
                days.append({
                    "date": iso, "dow": dow, "dateLabel": first.strip(),
                    "block": BLOCK_LABEL[sheet], "week": week_num,
                    "weekDates": week_dates, "weekFocus": week_focus,
                    "sessionTitle": session_title(session),
                    "sections": [],           # filled in Task 4
                    "_session": session,      # scratch, removed before write
                    "_loadCell": load_cell,   # scratch, removed before write
                })
    return days

def build_plan():
    days = extract_block_days()
    days.sort(key=lambda d: d["date"])
    return {"lifts": LIFTS, "defaultMaxes": DEFAULT_MAXES, "days": days}

def strip_scratch(plan):
    for d in plan["days"]:
        d.pop("_session", None)
        d.pop("_loadCell", None)
    return plan

def main():
    plan = build_plan()
    # NOTE: scratch fields kept until Task 4 wires sections; strip at the end.
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(strip_scratch(plan), indent=2, ensure_ascii=False))
    print(f"Wrote {len(plan['days'])} days to {OUT}")

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run to verify it passes**

Run: `python3 -m pytest tests/test_extract.py -q`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-plan.py tests/test_extract.py src/data/plan.json
git commit -m "feat: extract block-day metadata into plan.json"
```

---

## Task 3: Extractor — main-lift back-solve + correctness gate

**Files:**
- Modify: `scripts/extract-plan.py`
- Modify: `tests/test_extract.py`

Parse the main-lift line (e.g. `BACK SQUAT: 1x2 @ 80% · 2x2 @ 82.5% · 2x1 @ 85% · 3x4 @ 65%`). Back-solve `liftKey` from the printed `_loadCell` (`80% → 220 lb · …`). Assert every computed load equals the sheet.

- [ ] **Step 1: Write the failing test**

```python
# add to tests/test_extract.py
LIFT_MAX = {  # mirror DEFAULT_MAXES
    "backSquat": 275, "frontSquat": 225, "bench": 195, "strictPress": 135,
    "deadlift": 315, "cleanJerk": 205, "snatch": 145,
}

def round5(x): return round(x / 5) * 5

def test_main_lift_loads_match_sheet_for_default_maxes():
    plan = load_plan()
    checked = 0
    for d in plan["days"]:
        for s in d["sections"]:
            if s["type"] != "mainLift":
                continue
            mx = LIFT_MAX[s["liftKey"]]
            for st in s["sets"]:
                if "pct" in st:
                    assert round5(st["pct"] * mx) == st["expectedLoad"], (d["date"], st)
                    checked += 1
    assert checked > 50  # sanity: we verified a meaningful number of sets
```

- [ ] **Step 2: Run to verify it fails**

Run: `python3 -m pytest tests/test_extract.py::test_main_lift_loads_match_sheet_for_default_maxes -q`
Expected: FAIL (no `mainLift` sections yet).

- [ ] **Step 3: Implement back-solve + sets (into `extract-plan.py`)**

```python
# --- add near other helpers ---
LIFT_NAME_RE = re.compile(
    r"\b(BACK SQUAT|FRONT SQUAT|BENCH(?: PRESS)?|STRICT PRESS|PUSH PRESS|DEADLIFT|CLEAN & JERK|C&J|SNATCH)\b")

def round5(x): return round(x / 5) * 5

def parse_load_cell(load_cell):
    # "80% → 220 lb · 82.5% → 225 lb" -> [(0.80, 220), (0.825, 225), ...]
    pairs = []
    for pct_s, load_s in re.findall(r"(\d+(?:\.\d+)?)%\s*→\s*(\d+)", load_cell):
        pairs.append((float(pct_s) / 100.0, int(load_s)))
    return pairs

def backsolve_lift(pairs):
    # the lift whose default max reproduces every printed (pct -> load) under round5
    if not pairs:
        return None
    for key, mx in DEFAULT_MAXES.items():
        if all(round5(p * mx) == load for p, load in pairs):
            return key
    return None

SET_RE = re.compile(r"(\d+)\s*x\s*(\d+)\s*@\s*(\d+(?:\.\d+)?)%", re.IGNORECASE)

def parse_main_lift(session, load_cell):
    pairs = parse_load_cell(load_cell)
    lift_key = backsolve_lift(pairs)
    if not lift_key:
        return None
    # find the line that names a barbell lift and has "@ x%"
    line = next((ln for ln in session.splitlines()
                 if LIFT_NAME_RE.search(ln.upper()) and "%" in ln), None)
    if line is None:
        return None
    label_match = LIFT_NAME_RE.search(line.upper())
    # human display name from the matched lift, or the plan lift name
    display = next(l["name"] for l in LIFTS if l["key"] == lift_key)
    mx = DEFAULT_MAXES[lift_key]
    sets = []
    for count, reps, pct_s in SET_RE.findall(line):
        pct = float(pct_s) / 100.0
        sets.append({
            "scheme": f"{count}×{reps}",
            "pct": pct,
            "expectedLoad": round5(pct * mx),  # used by the correctness gate
        })
    # capture non-% cues on the same line (e.g. "1x1 heavy for the day")
    for m in re.finditer(r"(\d+x\d+)\s+([a-z][^·]*?)(?=·|$)", line, re.IGNORECASE):
        scheme, note = m.group(1), m.group(2).strip()
        if "@" not in note:
            sets.insert(0, {"scheme": scheme.replace("x", "×"), "note": note})
    return {"type": "mainLift", "label": "Main Lift",
            "liftName": display, "liftKey": lift_key, "sets": sets}
```

Wire it in `build_plan()` by attaching a temporary `_mainLift` to each day (sections assembled in Task 4):

```python
def build_plan():
    days = extract_block_days()
    for d in days:
        d["_mainLift"] = parse_main_lift(d["_session"], d["_loadCell"])
    days.sort(key=lambda d: d["date"])
    return {"lifts": LIFTS, "defaultMaxes": DEFAULT_MAXES, "days": days}
```

Temporarily surface `mainLift` in sections so the gate can run now:

```python
# in strip_scratch, before popping scratch, promote _mainLift into sections:
def strip_scratch(plan):
    for d in plan["days"]:
        if d.get("_mainLift"):
            d["sections"].append(d["_mainLift"])
        for k in ("_session", "_loadCell", "_mainLift"):
            d.pop(k, None)
    return plan
```

- [ ] **Step 4: Run to verify it passes; fix any flagged days**

Run: `python3 -m pytest tests/test_extract.py -q`
Expected: PASS. If a day's assertion fails, inspect that day's `_session`/`_loadCell` and adjust `SET_RE`/`parse_main_lift` until every printed load reproduces. Do NOT weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-plan.py tests/test_extract.py src/data/plan.json
git commit -m "feat: back-solve main lift and verify loads match the sheet"
```

---

## Task 4: Extractor — section parsing (prep / accessory / text)

**Files:**
- Modify: `scripts/extract-plan.py`
- Modify: `tests/test_extract.py`

Split each session into labeled boxes. First line → title (already). A `Prep …` paragraph → `prep`. The main-lift paragraph → the `mainLift` from Task 3, in position. Remaining paragraphs → `text` sections labeled "Accessory" or "Notes".

- [ ] **Step 1: Write the failing test**

```python
# add to tests/test_extract.py
def find_day(plan, iso):
    return next(d for d in plan["days"] if d["date"] == iso)

def test_lower_a_day_has_prep_main_accessory_boxes():
    plan = load_plan()
    d = find_day(plan, "2026-07-20")  # Mon Jul 20, Lower A
    types = [s["type"] for s in d["sections"]]
    assert types[0] == "prep"
    assert "mainLift" in types
    assert types.index("prep") < types.index("mainLift")
    assert any(t == "text" for t in types)  # accessory work
    assert d["sessionTitle"].lower().startswith("lower")

def test_conditioning_day_has_only_text_sections():
    plan = load_plan()
    d = find_day(plan, "2026-07-22")  # Wed, engine test day, no barbell %
    assert all(s["type"] == "text" for s in d["sections"])
    assert len(d["sections"]) >= 1
```

- [ ] **Step 2: Run to verify it fails**

Run: `python3 -m pytest tests/test_extract.py -q`
Expected: FAIL (sections currently hold only a trailing mainLift, no prep/text, order wrong).

- [ ] **Step 3: Implement section assembly**

```python
def make_sections(session, main_lift):
    paras = [p.strip() for p in re.split(r"\n\s*\n", session) if p.strip()]
    main_line_key = None
    if main_lift:
        main_line_key = main_lift["liftName"].split()[0].upper()  # e.g. "BACK"
    sections = []
    body_started = False
    for i, para in enumerate(paras):
        head = para.splitlines()[0]
        if i == 0:
            # first paragraph may be just the title, or title + prep on next lines
            rest = "\n".join(para.splitlines()[1:]).strip()
            if rest:
                para, head = rest, rest.splitlines()[0]
            else:
                continue
        if head.lower().startswith("prep"):
            label, _, text = head.partition("—")
            sections.append({"type": "prep", "label": label.strip() or "Prep",
                             "text": (text.strip() + "\n" +
                                      "\n".join(para.splitlines()[1:])).strip()})
            continue
        if main_lift and LIFT_NAME_RE.search(para.upper()) and "%" in para and not body_started:
            sections.append(main_lift)
            body_started = True
            continue
        sections.append({"type": "text",
                         "label": "Accessory" if body_started else "Notes",
                         "text": para})
    if main_lift and main_lift not in sections:
        sections.append(main_lift)
    return sections
```

Replace the temporary promotion in `strip_scratch` with real assembly in `build_plan()`:

```python
def build_plan():
    days = extract_block_days()
    for d in days:
        main_lift = parse_main_lift(d["_session"], d["_loadCell"])
        d["sections"] = make_sections(d["_session"], main_lift)
    days.sort(key=lambda d: d["date"])
    return {"lifts": LIFTS, "defaultMaxes": DEFAULT_MAXES, "days": days}

def strip_scratch(plan):
    for d in plan["days"]:
        for k in ("_session", "_loadCell", "_mainLift"):
            d.pop(k, None)
    return plan
```

- [ ] **Step 4: Run to verify it passes**

Run: `python3 -m pytest tests/test_extract.py -q`
Expected: PASS (all tests, including the Task 3 correctness gate).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-plan.py tests/test_extract.py src/data/plan.json
git commit -m "feat: parse session text into labeled prep/main/accessory boxes"
```

---

## Task 5: Extractor — ramp-in dated days

**Files:**
- Modify: `scripts/extract-plan.py`
- Modify: `tests/test_extract.py`

Expand `Ramp-In Jun9-Jul19` (weekly Mon–Sun "one thing" template + per-week `R1..R6` dial rows) into dated days Jun 9 – Jul 19, 2026. Each ramp-in day = one `text` "The one thing" box + one `text` "This week" box (dial + checkpoint). No loads.

- [ ] **Step 1: Write the failing test**

```python
# add to tests/test_extract.py
def test_rampin_days_exist_and_are_text_only():
    plan = load_plan()
    r = [d for d in plan["days"] if d["block"] == "Ramp-In"]
    assert len(r) >= 40           # ~6 weeks x 7 days
    assert any(d["date"] == "2026-07-06" for d in r)  # today falls in ramp-in
    for d in r:
        assert all(s["type"] == "text" for s in d["sections"])
    # ramp-in sorts before block days
    first_block = min(d["date"] for d in plan["days"] if d["block"] != "Ramp-In")
    assert min(d["date"] for d in r) < first_block
```

- [ ] **Step 2: Run to verify it fails**

Run: `python3 -m pytest tests/test_extract.py::test_rampin_days_exist_and_are_text_only -q`
Expected: FAIL (no ramp-in days).

- [ ] **Step 3: Implement ramp-in expansion**

```python
DOW_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

def extract_rampin_days():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Ramp-In Jun9-Jul19"]
    rows = [[c for c in r] for r in ws.iter_rows(values_only=True)]
    one_thing = {}   # DOW -> (title, why, loads)
    week_dial = []   # list of (Rn, dates, dial, checkpoint)
    for cells in rows:
        first = cells[0]
        if isinstance(first, str) and first.strip().upper() in DOW_ORDER:
            one_thing[first.strip().upper()] = (cells[1] or "", cells[2] or "", cells[3] or "")
        if isinstance(first, str) and re.match(r"R\d", first.strip()):
            week_dial.append((first.strip(), cells[1] or "", cells[2] or "", cells[3] or ""))
    # Ramp-in weeks start Mon Jun 9, 2026 (R1) ... 6 weeks
    start = datetime.date(2026, 6, 9)
    days = []
    for wi, (rn, wdates, dial, checkpoint) in enumerate(week_dial):
        for di, dow in enumerate(DOW_ORDER):
            date = start + datetime.timedelta(days=wi * 7 + di)
            if date > datetime.date(2026, 7, 19):
                continue
            title, why, loads = one_thing.get(dow, ("OFF", "", ""))
            one = title if not loads else f"{title}\n\nLoads / notes: {loads}"
            sections = [
                {"type": "text", "label": "The one thing (pre-class)", "text": one},
                {"type": "text", "label": f"This week · {rn}",
                 "text": (dial + ("\nCheckpoint: " + checkpoint if checkpoint and checkpoint != "—" else "")).strip()},
            ]
            days.append({
                "date": date.isoformat(), "dow": dow,
                "dateLabel": date.strftime("%a %b %-d"),
                "block": "Ramp-In", "week": rn, "weekDates": wdates.strip(),
                "weekFocus": "Pre-plan garnish — one small thing before class",
                "sessionTitle": (title.split("—")[0].strip() if title else "Off"),
                "sections": sections,
            })
    return days
```

Merge into `build_plan()`:

```python
def build_plan():
    days = extract_block_days()
    for d in days:
        main_lift = parse_main_lift(d["_session"], d["_loadCell"])
        d["sections"] = make_sections(d["_session"], main_lift)
    days = extract_rampin_days() + days
    days.sort(key=lambda d: d["date"])
    return {"lifts": LIFTS, "defaultMaxes": DEFAULT_MAXES, "days": days}
```

- [ ] **Step 4: Run to verify it passes**

Run: `python3 -m pytest tests/test_extract.py -q`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-plan.py tests/test_extract.py src/data/plan.json
git commit -m "feat: expand ramp-in into dated text-only days"
```

---

## Task 6: Plan schema + loader (`core/schema.ts`)

**Files:**
- Create: `src/core/schema.ts`, `test/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/schema.test.ts
import { describe, it, expect } from "vitest";
import { parsePlan, LIFT_KEYS } from "../src/core/schema";
import planJson from "../src/data/plan.json";

describe("plan schema", () => {
  it("parses the shipped plan.json", () => {
    const plan = parsePlan(planJson);
    expect(plan.days.length).toBeGreaterThan(120);
    expect(Object.keys(plan.defaultMaxes)).toEqual([...LIFT_KEYS]);
  });

  it("rejects malformed data", () => {
    expect(() => parsePlan({ days: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/schema.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement schema**

```ts
// src/core/schema.ts
import { z } from "zod";

export const LIFT_KEYS = [
  "backSquat", "frontSquat", "bench", "strictPress",
  "deadlift", "cleanJerk", "snatch",
] as const;

export const LiftKeySchema = z.enum(LIFT_KEYS);
export type LiftKey = z.infer<typeof LiftKeySchema>;

const PctSet = z.object({ scheme: z.string(), pct: z.number(), expectedLoad: z.number() });
const NoteSet = z.object({ scheme: z.string(), note: z.string() });
const SetSchema = z.union([PctSet, NoteSet]);

const PrepSection = z.object({ type: z.literal("prep"), label: z.string(), text: z.string() });
const TextSection = z.object({ type: z.literal("text"), label: z.string(), text: z.string() });
const MainLiftSection = z.object({
  type: z.literal("mainLift"), label: z.string(),
  liftName: z.string(), liftKey: LiftKeySchema, sets: z.array(SetSchema),
});
export const SectionSchema = z.union([PrepSection, MainLiftSection, TextSection]);
export type Section = z.infer<typeof SectionSchema>;

export const DaySchema = z.object({
  date: z.string(), dow: z.string(), dateLabel: z.string(),
  block: z.string(), week: z.union([z.number(), z.string()]),
  weekDates: z.string(), weekFocus: z.string(),
  sessionTitle: z.string(), sections: z.array(SectionSchema),
});
export type Day = z.infer<typeof DaySchema>;

export const PlanSchema = z.object({
  lifts: z.array(z.object({ key: LiftKeySchema, name: z.string(), isEstimate: z.boolean() })),
  defaultMaxes: z.record(LiftKeySchema, z.number()),
  days: z.array(DaySchema),
});
export type Plan = z.infer<typeof PlanSchema>;
export type Maxes = Record<LiftKey, number>;

export const parsePlan = (data: unknown): Plan => PlanSchema.parse(data);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/schema.ts test/schema.test.ts
git commit -m "feat: add zod plan schema and loader"
```

---

## Task 7: Load math (`core/loads.ts`)

**Files:**
- Create: `src/core/loads.ts`, `test/loads.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/loads.test.ts
import { describe, it, expect } from "vitest";
import { computeLoad, resolveDay } from "../src/core/loads";
import type { Day, Maxes } from "../src/core/schema";

const maxes: Maxes = {
  backSquat: 275, frontSquat: 225, bench: 195, strictPress: 135,
  deadlift: 315, cleanJerk: 205, snatch: 145,
};

describe("computeLoad", () => {
  it("rounds to the nearest 5 lb", () => {
    expect(computeLoad(0.8, 275)).toBe(220);
    expect(computeLoad(0.825, 275)).toBe(225);  // 226.875 -> 225
    expect(computeLoad(0.85, 275)).toBe(235);   // 233.75 -> 235
    expect(computeLoad(0.65, 275)).toBe(180);   // 178.75 -> 180
  });
});

describe("resolveDay", () => {
  const day: Day = {
    date: "2026-07-20", dow: "MON", dateLabel: "Mon Jul 20", block: "B1 Base",
    week: 1, weekDates: "Jul 20–26", weekFocus: "Baseline", sessionTitle: "Lower A",
    sections: [
      { type: "prep", label: "Prep", text: "cossacks" },
      { type: "mainLift", label: "Main Lift", liftName: "Back Squat", liftKey: "backSquat",
        sets: [
          { scheme: "1×2", pct: 0.8, expectedLoad: 220 },
          { scheme: "1×1", note: "heavy for the day" },
        ] },
    ],
  };

  it("fills concrete loads for pct sets and passes notes through", () => {
    const resolved = resolveDay(day, maxes);
    const main = resolved.sections.find((s) => s.type === "mainLift");
    expect(main && main.type === "mainLift" && main.rows).toEqual([
      { scheme: "1×2", pct: 0.8, load: 220 },
      { scheme: "1×1", note: "heavy for the day" },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/loads.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/core/loads.ts
import type { Day, Maxes, Section } from "./schema";

export const computeLoad = (pct: number, max: number): number =>
  Math.round((pct * max) / 5) * 5;

export type MainRow =
  | { scheme: string; pct: number; load: number }
  | { scheme: string; note: string };

export type ResolvedMainLift = {
  type: "mainLift"; label: string; liftName: string; rows: MainRow[];
};
export type ResolvedSection =
  | { type: "prep"; label: string; text: string }
  | { type: "text"; label: string; text: string }
  | ResolvedMainLift;
export type ResolvedDay = Omit<Day, "sections"> & { sections: ResolvedSection[] };

const resolveSection = (section: Section, maxes: Maxes): ResolvedSection => {
  if (section.type !== "mainLift") return section;
  const rows: MainRow[] = section.sets.map((set) =>
    "pct" in set
      ? { scheme: set.scheme, pct: set.pct, load: computeLoad(set.pct, maxes[section.liftKey]) }
      : { scheme: set.scheme, note: set.note });
  return { type: "mainLift", label: section.label, liftName: section.liftName, rows };
};

export const resolveDay = (day: Day, maxes: Maxes): ResolvedDay => ({
  ...day,
  sections: day.sections.map((s) => resolveSection(s, maxes)),
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/loads.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/loads.ts test/loads.test.ts
git commit -m "feat: add load computation and day resolution"
```

---

## Task 8: Current-day selection (`core/currentDay.ts`)

**Files:**
- Create: `src/core/currentDay.ts`, `test/currentDay.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/currentDay.test.ts
import { describe, it, expect } from "vitest";
import { pickCurrentDay } from "../src/core/currentDay";

const dates = ["2026-07-20", "2026-07-21", "2026-07-24"];

describe("pickCurrentDay", () => {
  it("returns today when today is a training day", () => {
    expect(pickCurrentDay(dates, "2026-07-21")).toBe("2026-07-21");
  });
  it("returns the next upcoming day when today is a rest day", () => {
    expect(pickCurrentDay(dates, "2026-07-22")).toBe("2026-07-24");
  });
  it("clamps to the first day before the plan starts", () => {
    expect(pickCurrentDay(dates, "2026-07-01")).toBe("2026-07-20");
  });
  it("clamps to the last day after the plan ends", () => {
    expect(pickCurrentDay(dates, "2027-02-01")).toBe("2026-07-24");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/currentDay.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/core/currentDay.ts
export const pickCurrentDay = (sortedDates: string[], today: string): string => {
  if (sortedDates.length === 0) throw new Error("no days");
  if (today <= sortedDates[0]) return sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  if (today >= last) return last;
  return sortedDates.find((d) => d >= today) ?? last;
};

export const todayIso = (now: Date = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/currentDay.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/currentDay.ts test/currentDay.test.ts
git commit -m "feat: add current-day selection with clamping"
```

---

## Task 9: Maxes store (`core/maxes-store.ts`)

**Files:**
- Create: `src/core/maxes-store.ts`, `test/maxes-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/maxes-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadMaxes, saveMaxes } from "../src/core/maxes-store";
import type { Maxes } from "../src/core/schema";

const defaults: Maxes = {
  backSquat: 275, frontSquat: 225, bench: 195, strictPress: 135,
  deadlift: 315, cleanJerk: 205, snatch: 145,
};

describe("maxes store", () => {
  beforeEach(() => localStorage.clear());

  it("returns defaults when nothing is saved", () => {
    expect(loadMaxes(defaults)).toEqual(defaults);
  });

  it("round-trips saved maxes", () => {
    const custom = { ...defaults, backSquat: 300 };
    saveMaxes(custom);
    expect(loadMaxes(defaults)).toEqual(custom);
  });

  it("falls back to defaults when stored data is corrupt", () => {
    localStorage.setItem("fotc.maxes", "{not json");
    expect(loadMaxes(defaults)).toEqual(defaults);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/maxes-store.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/core/maxes-store.ts
import { z } from "zod";
import { LIFT_KEYS, type Maxes } from "./schema";

const KEY = "fotc.maxes";
const MaxesSchema = z.object(
  Object.fromEntries(LIFT_KEYS.map((k) => [k, z.number().positive()])) as
    Record<(typeof LIFT_KEYS)[number], z.ZodNumber>,
);

export const loadMaxes = (defaults: Maxes): Maxes => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaults;
  try {
    return MaxesSchema.parse(JSON.parse(raw));
  } catch {
    return defaults;
  }
};

export const saveMaxes = (maxes: Maxes): void => {
  localStorage.setItem(KEY, JSON.stringify(maxes));
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/maxes-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/maxes-store.ts test/maxes-store.test.ts
git commit -m "feat: add localStorage maxes store with validation"
```

---

## Task 10: Hash router (`ui/router.ts`)

**Files:**
- Create: `src/ui/router.ts`

- [ ] **Step 1: Implement the router (no test — thin wrapper over `location.hash`)**

```ts
// src/ui/router.ts
export type Route =
  | { name: "maxes" }
  | { name: "schedule" }
  | { name: "day"; date: string };

export const parseRoute = (hash: string): Route | null => {
  const path = hash.replace(/^#/, "");
  if (path === "/maxes") return { name: "maxes" };
  if (path === "/schedule") return { name: "schedule" };
  const m = path.match(/^\/day\/(\d{4}-\d{2}-\d{2})$/);
  if (m) return { name: "day", date: m[1] };
  return null;
};

export const routeToHash = (route: Route): string => {
  if (route.name === "maxes") return "#/maxes";
  if (route.name === "schedule") return "#/schedule";
  return `#/day/${route.date}`;
};

export const onRouteChange = (handler: () => void): void => {
  window.addEventListener("hashchange", handler);
};

export const navigate = (route: Route): void => {
  window.location.hash = routeToHash(route);
};
```

- [ ] **Step 2: Add a small test for `parseRoute`**

```ts
// test/router.test.ts
import { describe, it, expect } from "vitest";
import { parseRoute, routeToHash } from "../src/ui/router";

describe("router", () => {
  it("parses each route", () => {
    expect(parseRoute("#/maxes")).toEqual({ name: "maxes" });
    expect(parseRoute("#/schedule")).toEqual({ name: "schedule" });
    expect(parseRoute("#/day/2026-07-20")).toEqual({ name: "day", date: "2026-07-20" });
    expect(parseRoute("#/nope")).toBeNull();
  });
  it("round-trips", () => {
    const r = { name: "day", date: "2026-07-20" } as const;
    expect(parseRoute(routeToHash(r).replace("", ""))).toEqual(r);
  });
});
```

Run: `npx vitest run test/router.test.ts` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui/router.ts test/router.test.ts
git commit -m "feat: add hash router"
```

---

## Task 11: Screens + styles + app bootstrap

**Files:**
- Create: `src/ui/maxes-screen.ts`, `src/ui/day-screen.ts`, `src/ui/schedule-screen.ts`, `src/ui/app.ts`
- Modify: `src/main.ts`, `src/styles.css`

Views are pure render functions returning `HTMLElement`; logic lives in the tested core. Styling mirrors the approved mockups (dark theme, boxed sections, Layout A load table, day-picker bar). This task is large; commit after each screen renders.

- [ ] **Step 1: Day screen** (`src/ui/day-screen.ts`) — day-picker bar (prev/next by index into sorted dates), "Today" chip, `sessionTitle`, and one boxed element per resolved section. Main-lift box renders the compact table: `scheme` · `pct%` · `load lb` (or the `note`). Accepts `(resolvedDay, { prevDate, nextDate, isToday })` and calls `navigate` on the arrows.

```ts
// src/ui/day-screen.ts
import type { ResolvedDay, ResolvedSection } from "../core/loads";
import { navigate } from "./router";

const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const renderMain = (s: Extract<ResolvedSection, { type: "mainLift" }>): HTMLElement => {
  const box = el("div", "box main");
  box.appendChild(el("div", "box-label", "Main Lift"));
  box.appendChild(el("div", "liftname", s.liftName));
  const table = el("table", "sets");
  for (const r of s.rows) {
    const tr = el("tr");
    tr.appendChild(el("td", "scheme", r.scheme));
    if ("load" in r) {
      tr.appendChild(el("td", "pct", `${+(r.pct * 100).toFixed(1)}%`));
      tr.appendChild(el("td", "load", `${r.load} lb`));
    } else {
      const td = el("td", "note", r.note); td.colSpan = 2;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  box.appendChild(table);
  return box;
};

const renderSection = (s: ResolvedSection): HTMLElement => {
  if (s.type === "mainLift") return renderMain(s);
  const box = el("div", `box ${s.type}`);
  box.appendChild(el("div", "box-label", s.label));
  const body = el("div", "box-text");
  body.textContent = s.text;
  box.appendChild(body);
  return box;
};

export const renderDayScreen = (
  day: ResolvedDay,
  nav: { prevDate: string | null; nextDate: string | null; isToday: boolean },
): HTMLElement => {
  const root = el("div", "screen day-screen");
  const picker = el("div", "picker");
  const prev = el("div", "arrow", "‹");
  if (nav.prevDate) prev.onclick = () => navigate({ name: "day", date: nav.prevDate! });
  const next = el("div", "arrow", "›");
  if (nav.nextDate) next.onclick = () => navigate({ name: "day", date: nav.nextDate! });
  const center = el("div", "center");
  center.appendChild(el("div", "date", day.dateLabel));
  center.appendChild(el("div", "wk", `${day.block} · ${typeof day.week === "number" ? "Week " + day.week : day.week}`));
  picker.append(prev, center, next);
  root.appendChild(picker);
  if (nav.isToday) root.appendChild(el("span", "today-chip", "● Today"));
  root.appendChild(el("div", "sess-title", day.sessionTitle));
  root.appendChild(el("div", "sess-sub", day.weekFocus));
  for (const s of day.sections) root.appendChild(renderSection(s));
  const link = el("a", "nav-link", "All weeks →");
  (link as HTMLAnchorElement).href = "#/schedule";
  root.appendChild(link);
  const mx = el("a", "nav-link", "Edit maxes");
  (mx as HTMLAnchorElement).href = "#/maxes";
  root.appendChild(mx);
  return root;
};
```

- [ ] **Step 2: Maxes screen** (`src/ui/maxes-screen.ts`)

```ts
// src/ui/maxes-screen.ts
import type { Plan, Maxes } from "../core/schema";

export const renderMaxesScreen = (
  plan: Plan, maxes: Maxes,
  onChange: (next: Maxes) => void, onReset: () => void,
): HTMLElement => {
  const root = document.createElement("div");
  root.className = "screen maxes-screen";
  root.innerHTML = `<div class="scr-title">Your Maxes</div>
    <div class="scr-sub">Every load recalculates automatically, rounded to the nearest 5 lb. Nothing leaves your phone.</div>`;
  for (const lift of plan.lifts) {
    const row = document.createElement("label");
    row.className = "maxrow";
    const name = document.createElement("div");
    name.className = "lift";
    name.textContent = lift.name;
    if (lift.isEstimate) {
      const est = document.createElement("span");
      est.className = "est"; est.textContent = "Estimate · test Wk 20";
      name.appendChild(est);
    }
    const wrap = document.createElement("div");
    wrap.className = "maxinput";
    const input = document.createElement("input");
    input.type = "number"; input.inputMode = "numeric";
    input.value = String(maxes[lift.key]);
    input.oninput = () => {
      const v = Number(input.value);
      if (v > 0) onChange({ ...maxes, [lift.key]: v });
    };
    const unit = document.createElement("span");
    unit.className = "unit"; unit.textContent = "lb";
    wrap.append(input, unit);
    row.append(name, wrap);
    root.appendChild(row);
  }
  const reset = document.createElement("button");
  reset.className = "reset"; reset.textContent = "Reset to example maxes";
  reset.onclick = onReset;
  root.appendChild(reset);
  const back = document.createElement("a");
  back.className = "nav-link"; back.href = "#/schedule"; back.textContent = "View schedule →";
  root.appendChild(back);
  return root;
};
```

- [ ] **Step 3: Schedule screen** (`src/ui/schedule-screen.ts`) — group days by `week` within block order, render week header + focus + tappable day rows linking to `#/day/<date>`; highlight `todayDate`.

```ts
// src/ui/schedule-screen.ts
import type { Plan } from "../core/schema";

const mainLiftLabel = (day: Plan["days"][number]): string => {
  const m = day.sections.find((s) => s.type === "mainLift");
  return m && m.type === "mainLift" ? m.liftName : day.sessionTitle;
};

export const renderScheduleScreen = (plan: Plan, todayDate: string): HTMLElement => {
  const root = document.createElement("div");
  root.className = "screen schedule-screen";
  root.innerHTML = `<div class="scr-title">Schedule</div>`;
  let currentWeek: string | number | null = null;
  for (const day of plan.days) {
    if (day.week !== currentWeek) {
      currentWeek = day.week;
      const head = document.createElement("div");
      head.className = "wk-head";
      const label = typeof day.week === "number" ? `Week ${day.week}` : `Ramp-In ${day.week}`;
      head.innerHTML = `<div><span class="wkn">${label}</span> <span class="wkdates">${day.weekDates}</span></div><div class="wkblock">${day.block}</div>`;
      root.appendChild(head);
      const focus = document.createElement("div");
      focus.className = "wk-focus"; focus.textContent = day.weekFocus;
      root.appendChild(focus);
    }
    const rowLink = document.createElement("a");
    rowLink.className = "dayrow" + (day.date === todayDate ? " today" : "");
    rowLink.href = `#/day/${day.date}`;
    rowLink.innerHTML =
      `<div class="dow">${day.dow}<br>${day.dateLabel.replace(/^[A-Za-z]{3}\s/, "")}</div>` +
      `<div class="sess">${day.sessionTitle}<div class="lift">${mainLiftLabel(day)}</div></div>` +
      `<div class="chev">›</div>`;
    root.appendChild(rowLink);
  }
  return root;
};
```

- [ ] **Step 4: App bootstrap** (`src/ui/app.ts`)

```ts
// src/ui/app.ts
import planJson from "../data/plan.json";
import { parsePlan, type Maxes } from "../core/schema";
import { resolveDay } from "../core/loads";
import { pickCurrentDay, todayIso } from "../core/currentDay";
import { loadMaxes, saveMaxes } from "../core/maxes-store";
import { parseRoute, navigate, onRouteChange } from "./router";
import { renderDayScreen } from "./day-screen";
import { renderMaxesScreen } from "./maxes-screen";
import { renderScheduleScreen } from "./schedule-screen";

export const startApp = (mount: HTMLElement): void => {
  const plan = parsePlan(planJson);
  const dates = plan.days.map((d) => d.date);
  let maxes: Maxes = loadMaxes(plan.defaultMaxes);

  const render = (): void => {
    const route = parseRoute(window.location.hash);
    if (!route) {
      navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) });
      return;
    }
    mount.innerHTML = "";
    if (route.name === "maxes") {
      mount.appendChild(renderMaxesScreen(plan, maxes,
        (next) => { maxes = next; saveMaxes(maxes); },
        () => { maxes = { ...plan.defaultMaxes }; saveMaxes(maxes); render(); }));
    } else if (route.name === "schedule") {
      mount.appendChild(renderScheduleScreen(plan, todayIso()));
    } else {
      const idx = dates.indexOf(route.date);
      const day = plan.days[idx];
      if (!day) { navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) }); return; }
      mount.appendChild(renderDayScreen(resolveDay(day, maxes), {
        prevDate: idx > 0 ? dates[idx - 1] : null,
        nextDate: idx < dates.length - 1 ? dates[idx + 1] : null,
        isToday: route.date === todayIso(),
      }));
    }
    window.scrollTo(0, 0);
  };

  onRouteChange(render);
  render();
};
```

- [ ] **Step 5: Wire `src/main.ts`**

```ts
// src/main.ts
import "./styles.css";
import { startApp } from "./ui/app";

const mount = document.querySelector<HTMLDivElement>("#app");
if (mount) startApp(mount);
```

- [ ] **Step 6: Styles** (`src/styles.css`) — port the classes from the approved mockups (`.screen`, `.picker`, `.box`, `.box.main`, `.box-label`, `table.sets`, `.wk-head`, `.dayrow`, `.maxrow`, `.today-chip`, `.nav-link`, etc.). Constrain `.screen` to `max-width: 480px; margin: 0 auto; padding: 14px`.

- [ ] **Step 7: Verify in the browser**

Run: `npm run dev`, open the URL. Confirm: app opens to today's day (2026-07-06, a ramp-in day); day-picker moves prev/next; schedule lists all weeks and jumps to days; maxes edits change loads and persist across reload; "Reset" restores defaults.

- [ ] **Step 8: Run full test + typecheck**

Run: `npm run test && npx tsc --noEmit`
Expected: all tests PASS; no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/ui src/main.ts src/styles.css
git commit -m "feat: add maxes, day, and schedule screens with routing"
```

---

## Task 12: Single-file build + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Build the single file**

Run: `npm run build`
Expected: `dist/index.html` produced with JS, CSS, and plan.json inlined (no other required assets).

- [ ] **Step 2: Verify offline single-file works**

Open `dist/index.html` directly via `file://` in a browser. Confirm the app boots, opens to the current day, and navigation/maxes work with no network.

- [ ] **Step 3: Write `README.md`**

Document: what it is; `npm run dev/test/build`; how to regenerate data (`npm run extract` after editing the workbook); how to host (`dist/index.html` on GitHub Pages) and how to share (send `dist/index.html`; recipient opens it, taps "Reset to example maxes", enters their own). Note lb-only, view-only, data stored in `localStorage`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add build, host, and share instructions"
```

---

## Self-Review

**Spec coverage:**
- Opens to current day → Task 8 + Task 11 Step 4.
- Loads recalculate from maxes, match sheet → Task 3 gate + Task 7.
- Labeled boxes per section → Task 4 + Task 11 Steps 1–3.
- Single self-contained offline HTML + hostable → Task 12.
- 3 screens, hash routing → Tasks 10–11.
- Ramp-in included; view-only; lb-only; no benchmarks/logging → Tasks 4–5, scope honored.
- Maxes persisted locally with fallback → Task 9.

**Placeholder scan:** No TBDs; every code step contains real code. Task 11 Step 6 (styles) references the approved mockup classes rather than repeating ~150 lines of CSS — the class names and layout are fixed by the mockups and listed explicitly.

**Type consistency:** `Maxes`, `LiftKey`, `Day`, `Section` from `schema.ts` used consistently; `resolveDay` returns `ResolvedDay`/`ResolvedSection` consumed by `day-screen.ts`; `expectedLoad` lives only in `plan.json`/schema (used by the extractor gate), while runtime rendering uses computed `load`.

**Known follow-ups (not blocking v1):** the extractor's `make_sections` may label some free-form later-block days as "Notes" vs "Accessory" imperfectly; acceptable since every section still renders as a labeled box. The main-lift correctness gate is the hard guarantee.
