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
