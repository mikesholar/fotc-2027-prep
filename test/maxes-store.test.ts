import { describe, it, expect, beforeEach } from "vitest";
import { loadMaxes, saveMaxes } from "../src/core/maxes-store";
import type { Maxes } from "../src/core/schema";

const defaults: Maxes = {
  backSquat: 275, frontSquat: 225, bench: 195, strictPress: 135,
  deadlift: 315, cleanJerk: 205, snatch: 145,
};

describe("maxes store", () => {
  beforeEach(() => localStorage.clear());

  it("returns defaults when nothing is saved", () => {
    expect(loadMaxes(defaults)).toEqual(defaults);
  });

  it("round-trips saved maxes", () => {
    const custom = { ...defaults, backSquat: 300 };
    saveMaxes(custom);
    expect(loadMaxes(defaults)).toEqual(custom);
  });

  it("falls back to defaults when stored data is corrupt", () => {
    localStorage.setItem("fotc.maxes", "{not json");
    expect(loadMaxes(defaults)).toEqual(defaults);
  });

  it("defaults to the fotc.maxes key when none is given", () => {
    const custom = { ...defaults, backSquat: 300 };
    saveMaxes(custom);
    expect(JSON.parse(localStorage.getItem("fotc.maxes")!)).toEqual(custom);
    expect(loadMaxes(defaults)).toEqual(custom);
  });

  it("keeps two athletes' maxes independent under different keys", () => {
    saveMaxes({ ...defaults, backSquat: 300 }, "fotc.maxes");
    saveMaxes({ ...defaults, backSquat: 205 }, "fotc.maxes.blair");

    expect(loadMaxes(defaults, "fotc.maxes").backSquat).toBe(300);
    expect(loadMaxes(defaults, "fotc.maxes.blair").backSquat).toBe(205);
  });

  it("returns defaults for a key that has nothing stored", () => {
    saveMaxes({ ...defaults, backSquat: 300 }, "fotc.maxes");
    expect(loadMaxes(defaults, "fotc.maxes.blair")).toEqual(defaults);
  });
});
