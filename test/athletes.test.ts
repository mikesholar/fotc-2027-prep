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
  it("has her own storage + skills keys and title, distinct from mike's", () => {
    expect(getAthlete("blair").storageKey).toBe("fotc.maxes.blair");
    expect(getAthlete("blair").skillsKey).toBe("fotc.skills.blair");
    expect(getAthlete("mike").storageKey).toBe("fotc.maxes");
    expect(getAthlete("mike").skillsKey).toBe("fotc.skills");
    expect(getAthlete("blair").title).not.toBe(getAthlete("mike").title);
  });
  it("reuses the FOTC days but with blair's maxes", () => {
    expect(getAthlete("blair").plan.days[0].sessionTitle).toBe("Jump rope cadence");
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

describe("erik's composed plan", () => {
  it("selects erik from ?athlete=erik", () => {
    expect(selectAthlete("?athlete=erik")).toBe("erik");
  });
  it("has his own storage + skills keys and title, distinct from mike's and blair's", () => {
    expect(getAthlete("erik").storageKey).toBe("fotc.maxes.erik");
    expect(getAthlete("erik").skillsKey).toBe("fotc.skills.erik");
    expect(getAthlete("erik").title).toBe("FOTC 2027 · Erik");
    expect(getAthlete("erik").title).not.toBe(getAthlete("blair").title);
  });
  it("reuses the FOTC days but with erik's provided maxes", () => {
    expect(getAthlete("erik").plan.days[0].sessionTitle).toBe("Jump rope cadence");
    expect(getAthlete("erik").plan.defaultMaxes.backSquat).toBe(350);
    expect(getAthlete("erik").plan.defaultMaxes.deadlift).toBe(385);
  });
  it("has no estimate flag on any lift", () => {
    expect(getAthlete("erik").plan.lifts.every((l) => l.isEstimate === false)).toBe(true);
  });
  it("leads with conditioning then the two half-owned skills, plus the qualifier block", () => {
    const erik = getAthlete("erik");
    expect(erik.plan.skills?.map((s) => s.movement)).toEqual(["Conditioning", "Wall walk", "Double-unders"]);
    expect(erik.plan.qualifierBlock).toBe("B3 Qualifier");
  });
});

describe("mike's hypertrophy plan", () => {
  it("keeps his maxes but runs the ten-week hypertrophy calendar", () => {
    const mike = getAthlete("mike");
    expect(mike.plan.defaultMaxes.backSquat).toBe(275);
    expect(mike.plan.days.length).toBe(70);
    expect(mike.plan.days[0].date).toBe("2026-08-17");
    expect(mike.title).toBe("5-Day Hypertrophy");
  });

  it("carries the two skill ladders and its own note, with no qualifier block", () => {
    const mike = getAthlete("mike");
    expect(mike.plan.skills?.map((s) => s.movement)).toEqual(["Pull-up", "Toes-to-bar"]);
    expect(mike.plan.skillsNote).toBeTruthy();
    expect(mike.plan.qualifierBlock).toBeUndefined();
    expect(mike.plan.solidCount).toBeUndefined();
  });

  it("drops the estimate badge, since the plan has no week 20 to retest in", () => {
    expect(getAthlete("mike").plan.lifts.every((l) => l.isEstimate === false)).toBe(true);
  });

  it("resolves the week-1 back squat to 200 lb off his 275 max", () => {
    const mike = getAthlete("mike");
    const day = mike.plan.days.find((d) => d.date === "2026-08-17")!;
    const resolved = resolveDay(day, mike.plan.defaultMaxes as Maxes);
    const main = resolved.sections.find((s) => s.type === "mainLift");
    expect(main && main.type === "mainLift" ? main.rows[0] : null).toMatchObject({ load: 200 });
  });
});

describe("blair and erik stay on the FOTC plan", () => {
  it("keeps their 178-day calendar rather than following mike onto hypertrophy", () => {
    expect(getAthlete("blair").plan.days.length).toBe(178);
    expect(getAthlete("erik").plan.days.length).toBe(178);
    expect(getAthlete("blair").plan.days[0].date).toBe("2026-06-09");
  });
});
