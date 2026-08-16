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

  it("accepts a movement section: a named movement with a prescription table, no max", () => {
    const plan = parsePlan({
      lifts: [{ key: "backSquat", name: "Back Squat", isEstimate: false }],
      defaultMaxes: { backSquat: 275 },
      days: [{
        date: "2026-08-17", dow: "MON", dateLabel: "Mon Aug 17", block: "Meso 1",
        week: 1, weekDates: "Aug 17–Aug 23", weekFocus: "Baseline",
        sessionTitle: "Lower A — Squat",
        sections: [{
          type: "movement", label: "Accessory", moveName: "DB Walking Lunge",
          rows: [{ scheme: "3 × 10–12", note: "per leg" }],
        }],
      }],
    });
    const section = plan.days[0].sections[0];
    expect(section.type === "movement" && section.moveName).toBe("DB Walking Lunge");
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

  it("accepts a plan that carries its own skills note instead of a qualifier block", () => {
    const plan = parsePlan({
      lifts: [{ key: "backSquat", name: "Back Squat", isEstimate: false }],
      defaultMaxes: { backSquat: 275 },
      days: [],
      skills: [{
        movement: "Toes-to-bar",
        status: "No",
        progression: [{ move: "Hanging knee raises", rx: "4 × 10", gate: "4 × 10 strict" }],
      }],
      skillsNote: "Two ladders to close over these 10 weeks.",
    });
    expect(plan.skillsNote).toBe("Two ladders to close over these 10 weeks.");
    expect(plan.qualifierBlock).toBeUndefined();
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
