import { describe, it, expect, beforeEach } from "vitest";
import { loadProgress, saveProgress, toggleStep, doneCount } from "../src/core/skills-store";

describe("skills progress store", () => {
  beforeEach(() => localStorage.clear());

  it("returns an empty map when nothing is saved", () => {
    expect(loadProgress("fotc.skills.blair")).toEqual({});
  });

  it("round-trips saved progress under a key", () => {
    const progress = { "Pull-ups": { "0": true } };
    saveProgress(progress, "fotc.skills.blair");
    expect(loadProgress("fotc.skills.blair")).toEqual(progress);
  });

  it("keeps two athletes' progress independent under different keys", () => {
    saveProgress({ "Pull-ups": { "0": true } }, "fotc.skills.blair");
    expect(loadProgress("fotc.skills.erik")).toEqual({});
  });

  it("falls back to empty when stored data is corrupt", () => {
    localStorage.setItem("fotc.skills.blair", "{not json");
    expect(loadProgress("fotc.skills.blair")).toEqual({});
  });

  it("toggles a step on and off immutably", () => {
    const start = {};
    const on = toggleStep(start, "Pull-ups", 2);
    expect(on).toEqual({ "Pull-ups": { "2": true } });
    expect(start).toEqual({});

    const off = toggleStep(on, "Pull-ups", 2);
    expect(off["Pull-ups"]["2"]).toBe(false);
  });

  it("counts only the checked steps for a movement", () => {
    let progress = toggleStep({}, "Pull-ups", 0);
    progress = toggleStep(progress, "Pull-ups", 1);
    progress = toggleStep(progress, "Pull-ups", 1);
    expect(doneCount(progress, "Pull-ups")).toBe(1);
    expect(doneCount(progress, "Wall walk")).toBe(0);
  });
});
