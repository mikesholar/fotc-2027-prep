import { describe, it, expect, vi } from "vitest";
import { renderSkillsScreen } from "../src/ui/skills-screen";
import { getAthlete } from "../src/data/athletes";
import type { SkillsProgress } from "../src/core/skills-store";

const plan = getAthlete("blair").plan;
const noop = (): void => {};

const chipTextFor = (root: HTMLElement, movement: string): string | undefined =>
  Array.from(root.querySelectorAll<HTMLElement>(".skill"))
    .find((s) => s.querySelector(".skill-name")?.textContent === movement)
    ?.querySelector(".chip")?.textContent ?? undefined;

describe("skills screen", () => {
  it("renders a card per gap with every rung and starts each chip at 'Not yet'", () => {
    const root = renderSkillsScreen(plan, "2026-09-28", {}, noop);

    const names = Array.from(root.querySelectorAll(".skill-name")).map((n) => n.textContent);
    expect(names).toEqual(["Pull-ups", "Wall walk", "Toes-to-bar"]);

    const chips = Array.from(root.querySelectorAll(".chip")).map((c) => c.textContent);
    expect(chips).toEqual(["Not yet", "Not yet", "Not yet"]);

    expect(root.querySelectorAll(".step .move").length).toBe(6 + 5 + 6);
    expect(root.querySelector(".solid-note")?.textContent).toContain("9 of 12");
  });

  it("renders a prescription and advance gate for each rung", () => {
    const root = renderSkillsScreen(plan, "2026-09-28", {}, noop);
    const firstStep = root.querySelector<HTMLElement>(".step")!;
    expect(firstStep.querySelector(".rx")?.textContent).toContain("max hold");
    expect(firstStep.querySelector(".gate")?.textContent).toContain("Advance:");
  });

  it("derives the chip from the number of checked rungs", () => {
    const progress: SkillsProgress = { "Pull-ups": { "0": true, "1": true } };
    const root = renderSkillsScreen(plan, "2026-09-28", progress, noop);
    expect(chipTextFor(root, "Pull-ups")).toBe("Building · 2/6");
  });

  it("shows 'Got it' once every rung of a movement is checked", () => {
    const progress: SkillsProgress = {
      "Wall walk": { "0": true, "1": true, "2": true, "3": true, "4": true },
    };
    const root = renderSkillsScreen(plan, "2026-09-28", progress, noop);
    expect(chipTextFor(root, "Wall walk")).toContain("Got it");
  });

  it("calls onToggle with the movement and rung index when a rung is tapped", () => {
    const onToggle = vi.fn();
    const root = renderSkillsScreen(plan, "2026-09-28", {}, onToggle);
    root.querySelector<HTMLElement>(".step")!.click();
    expect(onToggle).toHaveBeenCalledWith("Pull-ups", 0);
  });

  it("falls back to the qualifier deadline when a plan carries no skills note", () => {
    const root = renderSkillsScreen(plan, "2026-09-28", {}, noop);
    expect(root.querySelector(".scr-sub")?.textContent).toContain("Qualifier");
  });

  it("prefers the plan's own skills note over the qualifier deadline", () => {
    const root = renderSkillsScreen(
      { ...plan, skillsNote: "Two ladders to close over these 10 weeks." },
      "2026-09-28",
      {},
      noop,
    );
    const sub = root.querySelector(".scr-sub")?.textContent;
    expect(sub).toBe("Two ladders to close over these 10 weeks.");
    expect(sub).not.toContain("Qualifier");
  });

  it("links back to the day it was opened from, not the schedule", () => {
    const root = renderSkillsScreen(plan, "2026-09-28", {}, noop);
    const back = root.querySelector<HTMLAnchorElement>("a.nav-link")!;
    expect(back.getAttribute("href")).toBe("#/day/2026-09-28");
  });
});
