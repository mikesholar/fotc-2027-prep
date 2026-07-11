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

  it("accepts an optional skills/qualifier/solidCount block", () => {
    const plan = parsePlan({
      lifts: [{ key: "backSquat", name: "Back Squat", isEstimate: false }],
      defaultMaxes: { backSquat: 205 },
      days: [],
      skills: [{
        movement: "Pull-ups",
        status: "No",
        progression: [{ move: "Ring rows", rx: "3 × 8", gate: "3 × 10 clean" }],
        cue: "Warm-up",
      }],
      solidCount: 9,
      qualifierBlock: "B3 Qualifier",
    });
    expect(plan.skills?.[0].movement).toBe("Pull-ups");
    expect(plan.skills?.[0].progression[0].move).toBe("Ring rows");
    expect(plan.skills?.[0].progression[0].gate).toBe("3 × 10 clean");
    expect(plan.qualifierBlock).toBe("B3 Qualifier");
    expect(plan.solidCount).toBe(9);
  });

  it("rejects a skill with an unknown status", () => {
    expect(() =>
      parsePlan({
        lifts: [{ key: "backSquat", name: "Back Squat", isEstimate: false }],
        defaultMaxes: { backSquat: 205 },
        days: [],
        skills: [{ movement: "Pull-ups", status: "Maybe", progression: [{ move: "x" }] }],
      }),
    ).toThrow();
  });

  it("rejects a progression step with no move", () => {
    expect(() =>
      parsePlan({
        lifts: [{ key: "backSquat", name: "Back Squat", isEstimate: false }],
        defaultMaxes: { backSquat: 205 },
        days: [],
        skills: [{ movement: "Pull-ups", status: "No", progression: [{ rx: "3 × 8" }] }],
      }),
    ).toThrow();
  });
});
