import { describe, it, expect } from "vitest";
import { renderSkillsScreen } from "../src/ui/skills-screen";
import { getAthlete } from "../src/data/athletes";

describe("skills screen", () => {
  it("renders one card per gap with movement, chip text, and every progression step", () => {
    const root = renderSkillsScreen(getAthlete("blair").plan, "2026-09-28");

    const names = Array.from(root.querySelectorAll(".skill-name")).map((n) => n.textContent);
    expect(names).toEqual(["Pull-ups", "Wall walk", "Toes-to-bar"]);

    const chips = Array.from(root.querySelectorAll(".chip")).map((c) => c.textContent);
    expect(chips).toEqual(["Not yet", "Not yet", "Building"]);

    expect(root.querySelectorAll(".step .txt").length).toBe(4 + 3 + 3);
    expect(root.querySelector(".solid-note")?.textContent).toContain("9 of 12");
  });

  it("links back to the day it was opened from, not the schedule", () => {
    const root = renderSkillsScreen(getAthlete("blair").plan, "2026-09-28");
    const back = root.querySelector<HTMLAnchorElement>("a.nav-link")!;
    expect(back.getAttribute("href")).toBe("#/day/2026-09-28");
  });
});
