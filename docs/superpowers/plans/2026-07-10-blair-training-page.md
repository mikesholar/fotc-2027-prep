# Blair's Training Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Blair as a second athlete served from the same deployed page (`?athlete=blair`), reusing Mike's 26-week sessions against her own maxes, with a new Skills screen for her gap movements — leaving Mike's page byte-for-behavior unchanged.

**Architecture:** A single bundle carries both athletes. `selectAthlete(window.location.search)` picks the active athlete; an athlete registry composes Blair's `Plan` from Mike's days + lifts (with estimate flags off), her own default maxes, gap `skills`, and a `qualifierBlock`. `maxes-store` gains an optional storage-key parameter (defaulting to Mike's `fotc.maxes`) so Blair's maxes live under `fotc.maxes.blair`. Schema gains three optional fields, so Mike's plan still parses untouched. Blair's data (`src/data/blair.json`) is generated from `blair.xlsx` by a new Python script and committed like `plan.json`.

**Tech Stack:** TypeScript (strict), Vite + vite-plugin-singlefile, Vitest + jsdom, Zod, Python 3 + openpyxl.

**Working branch:** `feat/blair-training-page` (already created; spec at `docs/superpowers/specs/2026-07-10-blair-training-page-design.md`).

---

## File Structure

**Create:**
- `scripts/build-blair.py` — generates Blair's data from `blair.xlsx` + her 1RMs.
- `tests/test_build_blair.py` — Python gate on the generated `blair.json`.
- `src/data/blair.json` — generated artifact (committed).
- `src/data/athletes.ts` — athlete registry + `selectAthlete`.
- `src/ui/skills-screen.ts` — the Skills screen view.
- `test/athletes.test.ts`, `test/skills-screen.test.ts` — new unit tests.

**Modify:**
- `src/core/maxes-store.ts` — optional storage-key parameter.
- `src/core/schema.ts` — optional `skills`, `solidCount`, `qualifierBlock`; `Skill` type.
- `src/ui/router.ts` — `skills` route.
- `src/ui/app.ts` — resolve athlete; pass storage key; title; skills route; skills nav flag.
- `src/ui/day-screen.ts` — "Skills →" nav link when the athlete has skills.
- `src/ui/schedule-screen.ts` — 🎯 marker on the qualifier block.
- `src/styles.css` — Skills-screen + qualifier-marker classes (additive selectors only).
- `package.json` — `extract:blair` script.
- `test/router.test.ts` — skills route assertion.
- `README.md` — short note on Blair's URL (final task).

**Untouched (guaranteed):** `src/data/plan.json`, `.github/workflows/deploy.yml`, `scripts/extract-plan.py`, `index.html`, `src/ui/maxes-screen.ts`, `src/core/loads.ts`.

---

## Task 1: Parameterize the maxes store with an optional storage key

Make the store key configurable **without breaking Mike**: the key is a second, optional parameter defaulting to `"fotc.maxes"`, so every existing call and Mike's behavior are unchanged.

**Files:**
- Modify: `src/core/maxes-store.ts`
- Test: `test/maxes-store.test.ts`

- [ ] **Step 1: Add failing tests for key isolation**

Append these tests inside the `describe("maxes store", …)` block in `test/maxes-store.test.ts` (after the existing `it(...)` at line 26):

```ts
  it("defaults to the fotc.maxes key when none is given", () => {
    const custom = { ...defaults, backSquat: 300 };
    saveMaxes(custom);
    expect(JSON.parse(localStorage.getItem("fotc.maxes")!)).toEqual(custom);
    expect(loadMaxes(defaults)).toEqual(custom);
  });

  it("keeps two athletes' maxes independent under different keys", () => {
    saveMaxes({ ...defaults, backSquat: 300 }, "fotc.maxes");
    saveMaxes({ ...defaults, backSquat: 205 }, "fotc.maxes.blair");

    expect(loadMaxes(defaults, "fotc.maxes").backSquat).toBe(300);
    expect(loadMaxes(defaults, "fotc.maxes.blair").backSquat).toBe(205);
  });

  it("returns defaults for a key that has nothing stored", () => {
    saveMaxes({ ...defaults, backSquat: 300 }, "fotc.maxes");
    expect(loadMaxes(defaults, "fotc.maxes.blair")).toEqual(defaults);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- maxes-store`
Expected: FAIL — `saveMaxes`/`loadMaxes` do not yet accept a second argument, so the isolation tests store/read under the same key.

- [ ] **Step 3: Add the optional key parameter**

Replace the bodies of `loadMaxes` and `saveMaxes` in `src/core/maxes-store.ts` (lines 10-22) with:

```ts
export const loadMaxes = (defaults: Maxes, key: string = KEY): Maxes => {
  const raw = localStorage.getItem(key);
  if (!raw) return defaults;
  try {
    return MaxesSchema.parse(JSON.parse(raw));
  } catch {
    return defaults;
  }
};

export const saveMaxes = (maxes: Maxes, key: string = KEY): void => {
  localStorage.setItem(key, JSON.stringify(maxes));
};
```

(The existing `const KEY = "fotc.maxes";` at line 4 stays as the default.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- maxes-store`
Expected: PASS (all six tests, including the three original ones).

- [ ] **Step 5: Commit**

```bash
git add src/core/maxes-store.ts test/maxes-store.test.ts
git commit -m "feat: allow maxes store to use a per-athlete key

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Extend the plan schema with optional Blair-only fields

Add `skills`, `solidCount`, `qualifierBlock` as **optional** so Mike's `plan.json` still parses unchanged, plus a `Skill` type.

**Files:**
- Modify: `src/core/schema.ts`
- Test: `test/schema.test.ts`

- [ ] **Step 1: Write failing tests**

Append inside the `describe("plan schema", …)` block in `test/schema.test.ts` (after line 14):

```ts
  it("accepts an optional skills/qualifier/solidCount block", () => {
    const plan = parsePlan({
      lifts: [{ key: "backSquat", name: "Back Squat", isEstimate: false }],
      defaultMaxes: { backSquat: 205 },
      days: [],
      skills: [{ movement: "Pull-ups", status: "No", progression: ["Ring rows"], cue: "Warm-up" }],
      solidCount: 9,
      qualifierBlock: "B3 Qualifier",
    });
    expect(plan.skills?.[0].movement).toBe("Pull-ups");
    expect(plan.qualifierBlock).toBe("B3 Qualifier");
    expect(plan.solidCount).toBe(9);
  });

  it("rejects a skill with an unknown status", () => {
    expect(() =>
      parsePlan({
        lifts: [{ key: "backSquat", name: "Back Squat", isEstimate: false }],
        defaultMaxes: { backSquat: 205 },
        days: [],
        skills: [{ movement: "Pull-ups", status: "Maybe", progression: ["x"] }],
      }),
    ).toThrow();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- schema`
Expected: FAIL — `skills`/`qualifierBlock`/`solidCount` are stripped by the current schema (so `plan.skills` is `undefined`), and the unknown-status case does not throw.

- [ ] **Step 3: Add the Skill schema and optional plan fields**

In `src/core/schema.ts`, insert this block immediately after the `DaySchema`/`Day` definition (after line 30, before `PlanSchema`):

```ts
export const SkillSchema = z.object({
  movement: z.string(),
  status: z.enum(["No", "Some"]),
  progression: z.array(z.string()).min(1),
  cue: z.string().optional(),
});
export type Skill = z.infer<typeof SkillSchema>;
```

Then replace the `PlanSchema` definition (lines 32-36) with:

```ts
export const PlanSchema = z.object({
  lifts: z.array(z.object({ key: LiftKeySchema, name: z.string(), isEstimate: z.boolean() })),
  defaultMaxes: z.record(LiftKeySchema, z.number()),
  days: z.array(DaySchema),
  skills: z.array(SkillSchema).optional(),
  solidCount: z.number().optional(),
  qualifierBlock: z.string().optional(),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- schema`
Expected: PASS. Also run `npm test -- app` and confirm Mike's existing schema/app tests still pass (Mike's plan has none of the new fields, so they stay `undefined`).

- [ ] **Step 5: Commit**

```bash
git add src/core/schema.ts test/schema.test.ts
git commit -m "feat: add optional skills/qualifier fields to plan schema

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Generate Blair's data from her workbook

A Python script reads `blair.xlsx` (Novice column) + Blair's 1RMs and emits `src/data/blair.json`. Gap movements map to authored progressions.

**Files:**
- Create: `scripts/build-blair.py`
- Create: `tests/test_build_blair.py`
- Create (generated): `src/data/blair.json`
- Modify: `package.json`

- [ ] **Step 1: Write the Python gate test**

Create `tests/test_build_blair.py`:

```python
import json, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BLAIR = ROOT / "src" / "data" / "blair.json"


def load_blair():
    subprocess.run(["python3", "scripts/build-blair.py"], cwd=ROOT, check=True)
    return json.loads(BLAIR.read_text())


def test_blair_maxes_are_seven_positive_ints():
    b = load_blair()
    assert set(b["defaultMaxes"]) == {
        "backSquat", "frontSquat", "bench", "strictPress",
        "deadlift", "cleanJerk", "snatch",
    }
    assert b["defaultMaxes"]["backSquat"] == 205
    assert b["defaultMaxes"]["snatch"] == 110
    assert all(isinstance(v, int) and v > 0 for v in b["defaultMaxes"].values())


def test_solid_count_is_nine():
    assert load_blair()["solidCount"] == 9


def test_skills_are_the_three_novice_gaps_no_first():
    b = load_blair()
    assert [s["movement"] for s in b["skills"]] == ["Pull-ups", "Wall walk", "Toes-to-bar"]
    assert [s["status"] for s in b["skills"]] == ["No", "No", "Some"]


def test_every_skill_has_a_nonempty_progression():
    for s in load_blair()["skills"]:
        assert isinstance(s["progression"], list) and len(s["progression"]) >= 1
        assert all(isinstance(step, str) and step for step in s["progression"])


def test_qualifier_block_is_b3():
    assert load_blair()["qualifierBlock"] == "B3 Qualifier"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m pytest tests/test_build_blair.py -q`
Expected: FAIL — `scripts/build-blair.py` does not exist yet (subprocess raises `CalledProcessError` / file not found).

- [ ] **Step 3: Write the build script**

Create `scripts/build-blair.py`:

```python
import json, pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
XLSX = ROOT / "blair.xlsx"
OUT = ROOT / "src" / "data" / "blair.json"

# Blair's real 1RMs (provided by Mike).
BLAIR_MAXES = {
    "backSquat": 205, "frontSquat": 150, "bench": 125, "strictPress": 100,
    "deadlift": 215, "cleanJerk": 135, "snatch": 110,
}

# "Training Answers" sheet, 0-indexed columns: D = BLAIR movement (3), E = Have? (4).
MOVEMENT_COL, HAVE_COL = 3, 4

# Authored progressions per gap movement, keyed by the sheet's raw label.
# `display` renames the raw label to the competition movement.
GAP_PROGRESSIONS = {
    "Pull ups": {
        "display": "Pull-ups",
        "progression": [
            "Ring rows · 3–4 × 8–10", "Banded pull-ups",
            "Negatives · 3–5s lower", "Kip swing → kipping pull-up",
        ],
        "cue": "Slot into warm-up on pull days.",
    },
    "Wall walk": {
        "display": "Wall walk",
        "progression": [
            "Incline shoulder taps", "Partial wall walk (¾)",
            "Full wall walk · nose to wall",
        ],
    },
    "Knee to chest": {
        "display": "Toes-to-bar",
        "progression": ["Hanging knee raise", "Knee-to-elbow", "Toes-to-bar"],
    },
}

STATUS_ORDER = {"No": 0, "Some": 1}


def read_novice_rows():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Training Answers"]
    rows = []
    for r in ws.iter_rows(values_only=True):
        movement = r[MOVEMENT_COL] if len(r) > MOVEMENT_COL else None
        have = r[HAVE_COL] if len(r) > HAVE_COL else None
        if not isinstance(movement, str):
            continue
        have = have.strip() if isinstance(have, str) else ""
        if have in {"Yes", "Some", "No"}:
            rows.append((movement.strip(), have))
    return rows


def build_blair():
    rows = read_novice_rows()
    solid = [m for m, h in rows if h == "Yes"]
    gaps = [(m, h) for m, h in rows if h in {"No", "Some"}]
    skills = []
    for movement, have in gaps:
        prog = GAP_PROGRESSIONS.get(movement)
        if prog is None:
            raise ValueError(f"No authored progression for gap movement {movement!r}")
        entry = {"movement": prog["display"], "status": have,
                 "progression": prog["progression"]}
        if "cue" in prog:
            entry["cue"] = prog["cue"]
        skills.append(entry)
    skills.sort(key=lambda s: STATUS_ORDER[s["status"]])  # "No" gaps first
    return {
        "defaultMaxes": BLAIR_MAXES,
        "skills": skills,
        "solidCount": len(solid),
        "qualifierBlock": "B3 Qualifier",
    }


def main():
    data = build_blair()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"Wrote {len(data['skills'])} skills, solidCount={data['solidCount']} to {OUT}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Add the npm script**

In `package.json`, add to `"scripts"` (after the `"extract"` line at line 12):

```json
    "extract:blair": "python3 scripts/build-blair.py"
```

(Remember the trailing comma on the preceding `"extract"` line.)

- [ ] **Step 5: Generate the data and run the gate**

Run: `npm run extract:blair && python3 -m pytest tests/test_build_blair.py -q`
Expected: the script prints `Wrote 3 skills, solidCount=9 …`; all five pytest tests PASS. Confirm `src/data/blair.json` now exists and `defaultMaxes.backSquat` is `205`.

- [ ] **Step 6: Commit (including the workbook and generated JSON)**

```bash
git add scripts/build-blair.py tests/test_build_blair.py src/data/blair.json blair.xlsx package.json
git commit -m "feat: generate Blair's maxes and gap skills from blair.xlsx

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

(If `git add src/data/blair.json` reports it is ignored, re-run with `git add -f src/data/blair.json` — `plan.json` is committed, so `blair.json` should be too.)

---

## Task 4: Athlete registry and selection

Compose Blair's `Plan` from Mike's days/lifts + her generated data, and map the URL query to an athlete.

**Files:**
- Create: `src/data/athletes.ts`
- Test: `test/athletes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/athletes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectAthlete, getAthlete } from "../src/data/athletes";
import { resolveDay } from "../src/core/loads";
import type { Maxes } from "../src/core/schema";

describe("athlete selection", () => {
  it("defaults to mike with no query", () => {
    expect(selectAthlete("")).toBe("mike");
  });
  it("selects blair from ?athlete=blair", () => {
    expect(selectAthlete("?athlete=blair")).toBe("blair");
  });
  it("falls back to mike for an unknown athlete", () => {
    expect(selectAthlete("?athlete=nobody")).toBe("mike");
  });
});

describe("blair's composed plan", () => {
  it("has her own storage key and title, distinct from mike's", () => {
    expect(getAthlete("blair").storageKey).toBe("fotc.maxes.blair");
    expect(getAthlete("mike").storageKey).toBe("fotc.maxes");
    expect(getAthlete("blair").title).not.toBe(getAthlete("mike").title);
  });
  it("reuses mike's days but with blair's maxes", () => {
    expect(getAthlete("blair").plan.days.length).toBe(getAthlete("mike").plan.days.length);
    expect(getAthlete("blair").plan.defaultMaxes.backSquat).toBe(205);
  });
  it("has no estimate flag on any lift", () => {
    expect(getAthlete("blair").plan.lifts.every((l) => l.isEstimate === false)).toBe(true);
  });
  it("exposes the three gap skills and the qualifier block", () => {
    const blair = getAthlete("blair");
    expect(blair.plan.skills?.map((s) => s.movement)).toEqual(["Pull-ups", "Wall walk", "Toes-to-bar"]);
    expect(blair.plan.qualifierBlock).toBe("B3 Qualifier");
  });
  it("resolves the week-11 back squat to 165 lb off her 205 max", () => {
    const blair = getAthlete("blair");
    const day = blair.plan.days.find((d) => d.date === "2026-09-28")!;
    const resolved = resolveDay(day, blair.plan.defaultMaxes as Maxes);
    const main = resolved.sections.find((s) => s.type === "mainLift");
    expect(main && main.type === "mainLift" ? main.rows[0] : null).toMatchObject({ load: 165 });
  });
});

describe("mike's plan is unchanged by the registry", () => {
  it("keeps his default maxes and carries no skills or qualifier block", () => {
    const mike = getAthlete("mike");
    expect(mike.plan.defaultMaxes.backSquat).toBe(275);
    expect(mike.plan.skills).toBeUndefined();
    expect(mike.plan.qualifierBlock).toBeUndefined();
    expect(mike.title).toBe("FOTC 2027 Prep");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- athletes`
Expected: FAIL — `src/data/athletes.ts` does not exist.

- [ ] **Step 3: Implement the registry**

Create `src/data/athletes.ts`:

```ts
import planJson from "./plan.json";
import blairData from "./blair.json";
import { parsePlan, type Plan } from "../core/schema";

export type AthleteId = "mike" | "blair";

export type Athlete = {
  id: AthleteId;
  name: string;
  title: string;
  storageKey: string;
  plan: Plan;
};

const mikePlan = parsePlan(planJson);

const blairPlan = parsePlan({
  lifts: planJson.lifts.map((lift) => ({ ...lift, isEstimate: false })),
  defaultMaxes: blairData.defaultMaxes,
  days: planJson.days,
  skills: blairData.skills,
  solidCount: blairData.solidCount,
  qualifierBlock: blairData.qualifierBlock,
});

const ATHLETES: Record<AthleteId, Athlete> = {
  mike: { id: "mike", name: "Mike", title: "FOTC 2027 Prep", storageKey: "fotc.maxes", plan: mikePlan },
  blair: { id: "blair", name: "Blair", title: "FOTC 2027 · Blair", storageKey: "fotc.maxes.blair", plan: blairPlan },
};

export const selectAthlete = (search: string): AthleteId => {
  const athlete = new URLSearchParams(search).get("athlete");
  return athlete === "blair" ? "blair" : "mike";
};

export const getAthlete = (id: AthleteId): Athlete => ATHLETES[id];
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- athletes`
Expected: PASS (all cases, including the 165 lb resolution and the Mike-unchanged guard).

- [ ] **Step 5: Commit**

```bash
git add src/data/athletes.ts test/athletes.test.ts
git commit -m "feat: add athlete registry composing Blair's plan from Mike's days

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Add the `skills` route

**Files:**
- Modify: `src/ui/router.ts`
- Test: `test/router.test.ts`

- [ ] **Step 1: Write failing test**

In `test/router.test.ts`, add inside the `describe("router", …)` block (after line 10):

```ts
  it("parses the skills route", () => {
    expect(parseRoute("#/skills")).toEqual({ name: "skills" });
    expect(routeToHash({ name: "skills" })).toBe("#/skills");
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- router`
Expected: FAIL — `parseRoute("#/skills")` returns `null`.

- [ ] **Step 3: Add the route**

In `src/ui/router.ts`:

Replace the `Route` union (lines 1-4) with:

```ts
export type Route =
  | { name: "maxes" }
  | { name: "schedule" }
  | { name: "skills" }
  | { name: "day"; date: string };
```

In `parseRoute`, add after the `schedule` line (line 9):

```ts
  if (path === "/skills") return { name: "skills" };
```

In `routeToHash`, add after the `schedule` line (line 17):

```ts
  if (route.name === "skills") return "#/skills";
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- router`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/router.ts test/router.test.ts
git commit -m "feat: add #/skills route

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Skills screen view + styles

**Files:**
- Create: `src/ui/skills-screen.ts`
- Modify: `src/styles.css`
- Test: `test/skills-screen.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/skills-screen.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderSkillsScreen } from "../src/ui/skills-screen";
import { getAthlete } from "../src/data/athletes";

describe("skills screen", () => {
  it("renders one card per gap with movement, chip text, and every progression step", () => {
    const root = renderSkillsScreen(getAthlete("blair").plan);

    const names = Array.from(root.querySelectorAll(".skill-name")).map((n) => n.textContent);
    expect(names).toEqual(["Pull-ups", "Wall walk", "Toes-to-bar"]);

    const chips = Array.from(root.querySelectorAll(".chip")).map((c) => c.textContent);
    expect(chips).toEqual(["Not yet", "Not yet", "Building"]);

    expect(root.querySelectorAll(".step .txt").length).toBe(4 + 3 + 3);
    expect(root.querySelector(".solid-note")?.textContent).toContain("9 of 12");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- skills-screen`
Expected: FAIL — `src/ui/skills-screen.ts` does not exist.

- [ ] **Step 3: Implement the view**

Create `src/ui/skills-screen.ts`:

```ts
import type { Plan } from "../core/schema";
import { el } from "./dom";

const CHIP_TEXT: Record<"No" | "Some", string> = { No: "Not yet", Some: "Building" };
const CHIP_CLASS: Record<"No" | "Some", string> = { No: "chip no", Some: "chip some" };

export const renderSkillsScreen = (plan: Plan): HTMLElement => {
  const root = el("div", "screen skills-screen");
  root.appendChild(el("div", "scr-title", "Skills"));
  root.appendChild(el("div", "scr-sub",
    "Close these before the Qualifier — Week 11. Work 2–3×/week before class."));

  const skills = plan.skills ?? [];
  for (const skill of skills) {
    const card = el("div", "skill");
    const top = el("div", "skill-top");
    top.append(
      el("span", "skill-name", skill.movement),
      el("span", CHIP_CLASS[skill.status], CHIP_TEXT[skill.status]),
    );
    card.appendChild(top);

    const ladder = el("div", "ladder");
    for (const step of skill.progression) {
      const row = el("div", "step");
      const rung = el("div", "rung");
      rung.append(el("div", "node"), el("div", "line"));
      row.append(rung, el("div", "txt", step));
      ladder.appendChild(row);
    }
    card.appendChild(ladder);

    if (skill.cue) card.appendChild(el("div", "skill-cue", skill.cue));
    root.appendChild(card);
  }

  if (typeof plan.solidCount === "number") {
    const total = plan.solidCount + skills.length;
    root.appendChild(el("div", "solid-note",
      `✓ ${plan.solidCount} of ${total} Novice movements already solid`));
  }

  const back = el("a", "nav-link", "← Back to schedule");
  (back as HTMLAnchorElement).href = "#/schedule";
  root.appendChild(back);
  return root;
};
```

- [ ] **Step 4: Add the styles**

Append to the end of `src/styles.css`:

```css
/* ---- Skills screen (Blair) ---- */
.skill { background: #161b22; border: 1px solid #262c36; border-radius: 14px; padding: 12px 13px; margin-bottom: 11px; }
.skill-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.skill-name { font-size: 15px; font-weight: 800; color: #fff; }
.chip { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.chip.no { color: #ffb3ae; background: #f8514922; border: 1px solid #f8514955; }
.chip.some { color: #ffd980; background: #e3a00822; border: 1px solid #e3a00855; }
.ladder { display: flex; flex-direction: column; }
.step { display: flex; align-items: flex-start; gap: 9px; padding: 4px 0; }
.step .rung { display: flex; flex-direction: column; align-items: center; padding-top: 2px; }
.step .node { width: 9px; height: 9px; border-radius: 50%; border: 2px solid #7aa2ff; background: #0b0e12; }
.step:first-child .node { background: #7aa2ff; }
.step .line { width: 2px; flex: 1; min-height: 12px; background: #2a3446; }
.step:last-child .line { display: none; }
.step .txt { font-size: 12.5px; color: #d4d9e0; padding-bottom: 6px; }
.step:first-child .txt { color: #fff; font-weight: 600; }
.skill-cue { font-size: 11px; color: #7aa2ff; margin-top: 6px; }
.solid-note { font-size: 11px; color: #7aee8f; text-align: center; margin-top: 6px; padding: 8px; background: #7aee8f10; border: 1px solid #7aee8f2b; border-radius: 10px; }

/* ---- Qualifier marker (Blair schedule) ---- */
.qtarget { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; letter-spacing: .5px; color: #ffca7a; background: #e3a00822; border: 1px solid #e3a00855; padding: 2px 7px; border-radius: 999px; }
.wk-head.q { border-bottom-color: #e3a00855; }
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- skills-screen`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/skills-screen.ts src/styles.css test/skills-screen.test.ts
git commit -m "feat: add Skills screen and qualifier-marker styles

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire the app to the athlete (selection, storage key, title, skills, marker)

Route the app through the registry; add the "Skills →" day-screen link and the 🎯 schedule marker. Mike's default path is preserved.

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/ui/day-screen.ts`
- Modify: `src/ui/schedule-screen.ts`
- Test: `test/app.test.ts`

- [ ] **Step 1: Write failing tests**

Append to the end of `test/app.test.ts`:

```ts
describe("blair's page", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, "", "/?athlete=blair");
    window.location.hash = "#/maxes";
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("mounts blair's plan with her default max and title", () => {
    const mount = mountApp();
    const first = mount.querySelector<HTMLInputElement>(".maxrow input")!;
    expect(first.value).toBe("205");
    expect(document.title).toBe("FOTC 2027 · Blair");
  });

  it("stores edits under blair's key, never mike's", () => {
    const mount = mountApp();
    setInput(mount.querySelector<HTMLInputElement>(".maxrow input")!, "210");
    expect(localStorage.getItem("fotc.maxes.blair")).toContain("210");
    expect(localStorage.getItem("fotc.maxes")).toBeNull();
  });

  it("offers a Skills link on a day and renders three skill cards", () => {
    window.location.hash = "#/day/2026-09-28";
    const dayMount = mountApp();
    const link = Array.from(dayMount.querySelectorAll("a.nav-link")).find((a) => a.textContent === "Skills →");
    expect(link).toBeTruthy();

    window.location.hash = "#/skills";
    const skillsMount = mountApp();
    expect(skillsMount.querySelectorAll(".skill").length).toBe(3);
  });

  it("marks the qualifier block on her schedule", () => {
    window.location.hash = "#/schedule";
    const mount = mountApp();
    expect(mount.querySelector(".qtarget")).not.toBeNull();
    expect(mount.querySelector(".wk-head.q")).not.toBeNull();
  });
});

describe("mike's page has no skills affordance", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, "", "/");
  });

  it("shows no Skills link and redirects #/skills to a day", () => {
    window.location.hash = "#/day/2026-09-28";
    const mount = mountApp();
    const link = Array.from(mount.querySelectorAll("a.nav-link")).find((a) => a.textContent === "Skills →");
    expect(link).toBeUndefined();

    window.location.hash = "#/skills";
    mountApp();
    expect(window.location.hash).toMatch(/^#\/day\/\d{4}-\d{2}-\d{2}$/);
  });

  it("shows no qualifier marker on his schedule", () => {
    window.location.hash = "#/schedule";
    const mount = mountApp();
    expect(mount.querySelector(".qtarget")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- app`
Expected: FAIL — no athlete selection (Blair's title/max/key not applied), no "Skills →" link, no `.qtarget`.

- [ ] **Step 3: Rewrite `app.ts` to resolve the athlete**

Replace the entire contents of `src/ui/app.ts` with:

```ts
import { resolveDay } from "../core/loads";
import { pickCurrentDay, todayIso } from "../core/currentDay";
import { loadMaxes, saveMaxes } from "../core/maxes-store";
import { parseRoute, navigate, onRouteChange } from "./router";
import { renderDayScreen } from "./day-screen";
import { renderMaxesScreen } from "./maxes-screen";
import { renderScheduleScreen } from "./schedule-screen";
import { renderSkillsScreen } from "./skills-screen";
import { selectAthlete, getAthlete } from "../data/athletes";
import type { Maxes } from "../core/schema";

export const startApp = (mount: HTMLElement): void => {
  const athlete = getAthlete(selectAthlete(window.location.search));
  document.title = athlete.title;
  const plan = athlete.plan;
  const dates = plan.days.map((d) => d.date);
  const defaultMaxes = plan.defaultMaxes as Maxes;
  const hasSkills = (plan.skills?.length ?? 0) > 0;
  let maxes: Maxes = loadMaxes(defaultMaxes, athlete.storageKey);

  const render = (): void => {
    const route = parseRoute(window.location.hash);
    if (!route) {
      navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) });
      render();
      return;
    }
    mount.innerHTML = "";
    if (route.name === "maxes") {
      mount.appendChild(renderMaxesScreen(plan, maxes,
        (key, value) => { maxes = { ...maxes, [key]: value }; saveMaxes(maxes, athlete.storageKey); },
        () => { maxes = { ...defaultMaxes }; saveMaxes(maxes, athlete.storageKey); render(); }));
    } else if (route.name === "schedule") {
      mount.appendChild(renderScheduleScreen(plan, todayIso()));
    } else if (route.name === "skills") {
      if (!hasSkills) { navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) }); return; }
      mount.appendChild(renderSkillsScreen(plan));
    } else {
      const idx = dates.indexOf(route.date);
      const day = plan.days[idx];
      if (!day) { navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) }); return; }
      mount.appendChild(renderDayScreen(resolveDay(day, maxes), {
        prevDate: idx > 0 ? dates[idx - 1] : null,
        nextDate: idx < dates.length - 1 ? dates[idx + 1] : null,
        isToday: route.date === todayIso(),
        hasSkills,
      }));
    }
    if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
  };

  onRouteChange(render);
  render();
};
```

- [ ] **Step 4: Add the "Skills →" link to the day screen**

In `src/ui/day-screen.ts`, change the `nav` parameter type of `renderDayScreen` (line 57) to include `hasSkills`:

```ts
  nav: { prevDate: string | null; nextDate: string | null; isToday: boolean; hasSkills?: boolean },
```

Then, immediately after the `for (const s of day.sections) …` loop (after line 73) and **before** the `All weeks →` link, insert:

```ts
  if (nav.hasSkills) {
    const skills = el("a", "nav-link", "Skills →");
    (skills as HTMLAnchorElement).href = "#/skills";
    root.appendChild(skills);
  }
```

- [ ] **Step 5: Add the qualifier marker to the schedule**

In `src/ui/schedule-screen.ts`, replace `renderWeekHead` (lines 12-27) with:

```ts
const renderWeekHead = (day: Day, qualifierBlock?: string): HTMLElement => {
  const isQualifier = !!qualifierBlock && day.block === qualifierBlock;
  const head = el("div", isQualifier ? "wk-head q" : "wk-head");
  const left = el("div");
  const weekLabel = formatWeekLabel(day.week);
  left.append(
    el("span", "wkn", weekLabel),
    document.createTextNode(" "),
    el("span", "wkdates", day.weekDates),
  );
  if (isQualifier) {
    head.append(left, el("span", "qtarget", "🎯 Qualifier"));
  } else if (!weekLabel.startsWith(day.block)) {
    head.append(left, el("div", "wkblock", day.block));
  } else {
    head.append(left);
  }
  return head;
};
```

Then update the call inside `renderScheduleScreen` (line 55) from `renderWeekHead(day)` to:

```ts
      root.appendChild(renderWeekHead(day, plan.qualifierBlock));
```

- [ ] **Step 6: Run to verify pass**

Run: `npm test -- app`
Expected: PASS — Blair block (title/max/key/skills/marker) and Mike block (no link, `#/skills` redirects, no marker) all green.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS across every file (schema, maxes-store, router, athletes, skills-screen, app, loads, format, currentDay).

- [ ] **Step 8: Commit**

```bash
git add src/ui/app.ts src/ui/day-screen.ts src/ui/schedule-screen.ts test/app.test.ts
git commit -m "feat: serve Blair via ?athlete=blair with skills + qualifier marker

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Full verification and docs

Confirm the production build works, Blair renders in a real browser, Mike is untouched, and document the URL.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Typecheck + production build**

Run: `npm run build`
Expected: `tsc` passes with no errors (strict, no unused locals/params) and Vite writes a single `dist/index.html`. No new errors versus before.

- [ ] **Step 2: Verify the built bundle carries Blair**

Run: `grep -c "fotc.maxes.blair" dist/index.html`
Expected: at least `1` (Blair's storage key is inlined, confirming both athletes are bundled).

- [ ] **Step 3: Manually verify both athletes in the dev server**

Run: `npm run dev` and open the printed URL.
- Base URL (no query): confirm it's **Mike** — title "FOTC 2027 Prep", his loads, no "Skills →" link, `#/skills` bounces to a day, no 🎯 on the schedule.
- Append `?athlete=blair` to the URL: confirm it's **Blair** — title "FOTC 2027 · Blair", a day resolves to her numbers (e.g. `#/day/2026-09-28` shows Back Squat 3×2 → **165 lb**), the "Skills →" link opens three cards (Pull-ups/Wall walk "Not yet", Toes-to-bar "Building", "9 of 12 … solid"), and the schedule shows 🎯 on the B3 Qualifier weeks.
- Edit a max as Blair, reload with the same `?athlete=blair` URL, and confirm it persisted. Switch back to the base URL and confirm Mike's maxes are unaffected. Stop the dev server when done.

- [ ] **Step 4: Confirm Mike's plan artifact is byte-for-byte unchanged**

Run: `git status --porcelain src/data/plan.json .github/workflows/deploy.yml scripts/extract-plan.py index.html`
Expected: **no output** (none of Mike's core artifacts were modified anywhere in this branch).

- [ ] **Step 5: Document Blair's URL**

In `README.md`, add this section after the "Share it" section:

```markdown
## A second athlete (Blair)

The same page serves more than one athlete, selected by URL:

- **Mike** (default): the site URL as-is.
- **Blair:** append `?athlete=blair` — her own maxes (stored separately under
  `fotc.maxes.blair`), Mike's identical sessions resolved to her numbers, and a **Skills**
  screen for her gap movements ahead of the Qualifier.

Blair's data is generated from `blair.xlsx` into `src/data/blair.json` (committed):

​```bash
npm run extract:blair
​```

Her page reuses Mike's daily sessions verbatim; only her maxes, the Skills screen, and the
Qualifier marker differ. To add another athlete later, generate their data file and add an
entry to `src/data/athletes.ts`.
```

- [ ] **Step 6: Final commit**

```bash
git add README.md
git commit -m "docs: document Blair's ?athlete=blair page and data build

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes (coverage vs. spec)

- **One page, `?athlete=blair`, default Mike** → Task 4 (`selectAthlete`), Task 7 (app wiring), Task 8 (browser verification).
- **Storage isolation (`fotc.maxes.blair`)** → Task 1 (key param), Task 4 (registry key), Task 7 (app passes key + test).
- **Reuse Mike's days/lifts; no estimate flag** → Task 4 (compose from `planJson.days`, `isEstimate: false`).
- **Blair's real 1RMs as defaults** → Task 3 (`BLAIR_MAXES`), asserted in Tasks 3 & 4.
- **Skills screen from the Novice gaps** → Task 3 (derivation), Task 6 (view), Tasks 5/7 (route + link).
- **Qualifier emphasis** → Task 3 (`qualifierBlock`), Task 7 (schedule marker), Task 6 (styles).
- **Optional schema fields keep Mike parsing** → Task 2.
- **Mike untouched (guaranteed + tested)** → Task 4 guard test, Task 7 Mike-no-skills tests, Task 8 `git status` check.
- **Erik-ready** → Task 3 script is column-mappable; Task 4 registry + Task 8 README note describe adding an athlete.
- **Deploy workflow unchanged** → not modified in any task; single `dist/` still uploaded (Task 8 build check).
