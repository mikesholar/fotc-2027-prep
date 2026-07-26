# FOTC 2027 Prep — Project Notes

## Gotchas

#### Gotcha: Prep/Accessory bullet rendering is scoped by label string

**Context**: Prep & Accessory sections render as bulleted movement lists (lead line + `<ul>`), while other sections (Notes, "The one thing (pre-class)", "This week · Rn") stay as plain prose.

**Issue**: The distinction is driven entirely by the section's `label` — both Accessory and the narrative sections share `type: "text"`, so `type` alone can't tell them apart. The list treatment (and the larger 15px font) is gated on `MOVEMENT_LABELS` in `src/ui/day-screen.ts`.

**Solution**: If the plan data (`src/data/*.json`) ever renames the `"Prep"` or `"Accessory"` labels, update the `MOVEMENT_LABELS` set in `src/ui/day-screen.ts` to match — otherwise those sections silently fall back to the old single-text-box rendering.

```ts
// src/ui/day-screen.ts
const MOVEMENT_LABELS = new Set(["Prep", "Accessory"]);
```

The parsing logic itself lives in `src/core/movement-list.ts` (`parseMovementBody`) and is label-agnostic — it splits on ` · ` and newlines and is covered by `test/movement-list.test.ts`.
