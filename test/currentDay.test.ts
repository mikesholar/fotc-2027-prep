import { describe, it, expect } from "vitest";
import { pickCurrentDay } from "../src/core/currentDay";

const dates = ["2026-07-20", "2026-07-21", "2026-07-24"];

describe("pickCurrentDay", () => {
  it("returns today when today is a training day", () => {
    expect(pickCurrentDay(dates, "2026-07-21")).toBe("2026-07-21");
  });
  it("returns the next upcoming day when today is a rest day", () => {
    expect(pickCurrentDay(dates, "2026-07-22")).toBe("2026-07-24");
  });
  it("clamps to the first day before the plan starts", () => {
    expect(pickCurrentDay(dates, "2026-07-01")).toBe("2026-07-20");
  });
  it("clamps to the last day after the plan ends", () => {
    expect(pickCurrentDay(dates, "2027-02-01")).toBe("2026-07-24");
  });
});
