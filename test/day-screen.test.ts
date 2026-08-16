import { describe, it, expect } from "vitest";
import { renderDayScreen } from "../src/ui/day-screen";
import type { ResolvedDay, ResolvedSection } from "../src/core/loads";

const getMockDay = (sections: ResolvedSection[]): ResolvedDay => ({
  date: "2026-07-20",
  dow: "MON",
  dateLabel: "Mon Jul 20",
  block: "B1 Base",
  week: 1,
  weekDates: "Jul 20–Jul 26",
  weekFocus: "BASELINE WEEK",
  sessionTitle: "Lower A",
  sections,
});

const nav = { prevDate: null, nextDate: null, isToday: false };

const boxFor = (root: HTMLElement, label: string): HTMLElement =>
  Array.from(root.querySelectorAll<HTMLElement>(".box")).find(
    (b) => b.querySelector(".box-label")?.textContent === label,
  )!;

describe("day screen movement sections", () => {
  it("renders a Prep box as a lead line above a bulleted movement list", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "prep",
          label: "Prep",
          text: "3 rounds: 16 goblet cossack squats · 10 back ext off GHD · 8 reverse Nordics",
        },
      ]),
      nav,
    );

    const box = boxFor(root, "Prep");
    expect(box.querySelector(".box-lead")?.textContent).toBe("3 rounds:");
    const items = Array.from(box.querySelectorAll(".box-list li")).map((li) => li.textContent);
    expect(items).toEqual([
      "16 goblet cossack squats",
      "10 back ext off GHD",
      "8 reverse Nordics",
    ]);
  });

  it("renders newline-separated Accessory movements as a single bulleted list", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "text",
          label: "Accessory",
          text: "3x8 Bulgarian split squats\n3x12 stiff-leg deadlift\n3x20 kip swings",
        },
      ]),
      nav,
    );

    const box = boxFor(root, "Accessory");
    expect(box.querySelector(".box-lead")).toBeNull();
    const items = Array.from(box.querySelectorAll(".box-list li")).map((li) => li.textContent);
    expect(items).toEqual([
      "3x8 Bulgarian split squats",
      "3x12 stiff-leg deadlift",
      "3x20 kip swings",
    ]);
  });

  it("renders a single-sentence Accessory note as plain text, not a list", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "text",
          label: "Accessory",
          text: "Week 1 mindset: RPE honesty > heroics.",
        },
      ]),
      nav,
    );

    const box = boxFor(root, "Accessory");
    expect(box.querySelector(".box-list")).toBeNull();
    expect(box.querySelector(".box-text")?.textContent).toBe("Week 1 mindset: RPE honesty > heroics.");
  });

  it("renders a Skill box as a lead line above its bulleted dose", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "text",
          label: "Skill",
          text: "Pull-up — your current rung on the Skills screen: 4 sets · full hang every rep · 2–3 min rest",
        },
      ]),
      nav,
    );

    const box = boxFor(root, "Skill");
    expect(box.querySelector(".box-lead")?.textContent).toBe(
      "Pull-up — your current rung on the Skills screen:",
    );
    const items = Array.from(box.querySelectorAll(".box-list li")).map((li) => li.textContent);
    expect(items).toEqual(["4 sets", "full hang every rep", "2–3 min rest"]);
  });

  it("marks Prep, Skill and Accessory boxes with a movement class but not narrative boxes", () => {
    const root = renderDayScreen(
      getMockDay([
        { type: "prep", label: "Prep", text: "3 rounds: a · b" },
        { type: "text", label: "Skill", text: "Toes-to-bar: 4 sets · slow" },
        { type: "text", label: "Accessory", text: "x\ny" },
        { type: "text", label: "Notes", text: "just prose" },
      ]),
      nav,
    );

    expect(boxFor(root, "Prep").classList.contains("movement")).toBe(true);
    expect(boxFor(root, "Skill").classList.contains("movement")).toBe(true);
    expect(boxFor(root, "Accessory").classList.contains("movement")).toBe(true);
    expect(boxFor(root, "Notes").classList.contains("movement")).toBe(false);
  });

  it("leaves narrative sections untouched even when they contain delimiters", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "text",
          label: "Notes",
          text: "Establish the habit.\nCheckpoint: talked to a partner?",
        },
      ]),
      nav,
    );

    const box = boxFor(root, "Notes");
    expect(box.querySelector(".box-list")).toBeNull();
    expect(box.querySelector(".box-text")?.textContent).toBe(
      "Establish the habit.\nCheckpoint: talked to a partner?",
    );
  });
});
