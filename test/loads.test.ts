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
    expect(computeLoad(0.9, 225)).toBe(205);    // 202.5 -> 205 (round half up)
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
      { type: "movement", label: "Accessory", moveName: "Romanian Deadlift",
        rows: [
          { scheme: "3 × 8–10", note: "" },
          { scheme: "Cue", note: "push the hips back" },
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

  it("passes a load-free movement section straight through", () => {
    const resolved = resolveDay(day, maxes);
    const movement = resolved.sections.find((s) => s.type === "movement");
    expect(movement && movement.type === "movement" && movement.moveName).toBe(
      "Romanian Deadlift",
    );
    expect(movement && movement.type === "movement" && movement.rows).toEqual([
      { scheme: "3 × 8–10", note: "" },
      { scheme: "Cue", note: "push the hips back" },
    ]);
  });
});
