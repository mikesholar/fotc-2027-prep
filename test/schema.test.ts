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
