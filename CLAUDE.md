# FOTC 2027 Prep — Project Notes

## Gotchas

#### Gotcha: Prep/Skill/Accessory bullet rendering is scoped by label string

**Context**: Prep, Skill & Accessory sections render as bulleted movement lists (lead line + `<ul>`), while other sections (Notes, "The one thing (pre-class)", "This week · Rn") stay as plain prose.

**Issue**: The distinction is driven entirely by the section's `label` — Skill, Accessory and the narrative sections all share `type: "text"`, so `type` alone can't tell them apart. The list treatment (and the larger 15px font) is gated on `MOVEMENT_LABELS` in `src/ui/day-screen.ts`.

**Solution**: If the plan data (`src/data/*.json`) ever renames the `"Prep"`, `"Skill"` or `"Accessory"` labels, update the `MOVEMENT_LABELS` set in `src/ui/day-screen.ts` to match — otherwise those sections silently fall back to the old single-text-box rendering.

```ts
// src/ui/day-screen.ts
const MOVEMENT_LABELS = new Set(["Prep", "Skill", "Accessory"]);
```

The parsing logic itself lives in `src/core/movement-list.ts` (`parseMovementBody`) and is label-agnostic — it splits on ` · ` and newlines and is covered by `test/movement-list.test.ts`.

#### Decision: `mainLift` vs `movement` sections — same look, different job

**Context**: The hypertrophy plan renders each accessory as its own box laid out like a main lift (movement name + a table of prescribed sets), rather than one bulleted "Accessory" list.

**Issue**: `mainLift` requires a `liftKey`, because its whole job is `pct × max` load math. Accessories are dumbbell and bodyweight work with no 1RM to resolve against. Making `liftKey` optional would have pushed an unreachable "percentage set with no lift key" branch into `resolveDay`.

**Solution**: A second section type, `movement`, carries `moveName` plus `rows: {scheme, note}[]` and no load math — `resolveDay` passes it straight through. Both types render through the shared `renderLiftBox()` in `day-screen.ts`, so they look identical.

```
mainLift  -> has a liftKey, sets may carry pct/expectedLoad, resolveDay computes loads
movement  -> no liftKey, rows are always {scheme, note}, resolveDay is a pass-through
```

Pick `mainLift` when there's a weight to compute, `movement` when you just want the prescription table. Only Mike's plan emits `movement` sections; Blair's and Erik's accessories are still free-text `text` sections from the workbook, which is why `MOVEMENT_LABELS` still needs `"Accessory"` in it.

#### Gotcha: `LIFT_KEYS` cannot grow without invalidating stored maxes

**Context**: The hypertrophy plan programs Barbell Row and Incline Barbell Press, neither of which has a 1RM in `LIFT_KEYS`.

**Issue**: `MaxesSchema` in `src/core/maxes-store.ts` is a `z.object` built from `LIFT_KEYS`, so it requires **every** key to be present. Adding an eighth key makes `loadMaxes` reject every athlete's already-persisted `localStorage` blob — they'd silently snap back to the defaults, losing their real numbers. (`PlanSchema.defaultMaxes` is a `z.record`, which is permissive, so the failure only shows up at load time, not at parse time.)

**Solution**: Derive lifts that lack their own max from a related one and print the basis in a note row, rather than widening the enum.

```py
# scripts/build-hypertrophy.py — Barbell Row is 45% of the *deadlift* 1RM
Lift("Main Lift", "Barbell Row", "deadlift", "deadlift", 4, 6, 10, 0.45, 0.025, ...)
```

The `liftName` is free text and independent of `liftKey`, which is what makes this work. Every main-lift section carries a `{"scheme": "Load", "note": "% is of your <basis> 1RM …"}` row so the percentage is never ambiguous in the gym; `tests/test_build_hypertrophy.py` asserts that note exists on every lift.

#### Decision: Mike is the hypertrophy athlete, `plan.json` is the FOTC plan

**Context**: `src/data/plan.json` used to be Mike's plan, and Blair and Erik reused its `days` verbatim.

**Issue**: Swapping Mike onto the 5-day hypertrophy program would have dragged Blair and Erik — who are still prepping for the FOTC Qualifier — along with him.

**Solution**: `plan.json` is now *the FOTC plan* rather than *Mike's plan*. Mike reads `src/data/hypertrophy.json`; Blair and Erik still compose off `plan.json`. If you add a fourth athlete, pick which plan file they compose from in `src/data/athletes.ts`.

#### Gotcha: the Skills screen subtitle is plan-driven, not global

`plan.skillsNote` (optional) overrides the default *"Close these before the Qualifier — Week 11"* line. Blair and Erik omit it and get the qualifier wording; the hypertrophy plan sets its own. A plan with skills but no `qualifierBlock` will still render fine — the 🎯 marker and the `solidCount` footer are both independently optional.
