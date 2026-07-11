import { describe, it, expect } from "vitest";
import { parseRoute, routeToHash } from "../src/ui/router";

describe("router", () => {
  it("parses each route", () => {
    expect(parseRoute("#/maxes")).toEqual({ name: "maxes" });
    expect(parseRoute("#/schedule")).toEqual({ name: "schedule" });
    expect(parseRoute("#/day/2026-07-20")).toEqual({ name: "day", date: "2026-07-20" });
    expect(parseRoute("#/nope")).toBeNull();
  });
  it("parses the skills route", () => {
    expect(parseRoute("#/skills")).toEqual({ name: "skills" });
    expect(routeToHash({ name: "skills" })).toBe("#/skills");
  });
  it("round-trips a day route", () => {
    const r = { name: "day", date: "2026-07-20" } as const;
    expect(parseRoute(routeToHash(r))).toEqual(r);
  });
});
