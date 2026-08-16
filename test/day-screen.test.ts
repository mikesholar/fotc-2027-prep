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

  it("gives an accessory movement the same box and table as a main lift", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "mainLift",
          label: "Main Lift",
          liftName: "Back Squat",
          rows: [{ scheme: "4×5", pct: 0.73, load: 200 }],
        },
        {
          type: "movement",
          label: "Accessory",
          moveName: "Bulgarian Split Squat (DB)",
          rows: [
            { scheme: "3 × 8–12", note: "per leg" },
            { scheme: "Cue", note: "rear foot on the bench" },
          ],
        },
      ]),
      nav,
    );

    const accessory = boxFor(root, "Accessory");
    expect(accessory.classList.contains("main")).toBe(true);
    expect(accessory.querySelector(".liftname")?.textContent).toBe("Bulgarian Split Squat (DB)");
    expect(accessory.querySelector(".box-list")).toBeNull();

    const rows = Array.from(accessory.querySelectorAll("table.sets tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) => td.textContent),
    );
    expect(rows).toEqual([
      ["3 × 8–12", "per leg"],
      ["Cue", "rear foot on the bench"],
    ]);
  });

  it("mutes a cue row but leaves prescriptive notes highlighted", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "movement",
          label: "Accessory",
          moveName: "Standing Calf Raise",
          rows: [
            { scheme: "4 × 10–15", note: "" },
            { scheme: "Load", note: "~60% of your usual working weight" },
            { scheme: "Cue", note: "toes on a plate, pause at the top" },
          ],
        },
      ]),
      nav,
    );

    const notes = Array.from(boxFor(root, "Accessory").querySelectorAll("td.note"));
    const muted = notes.filter((td) => td.classList.contains("muted"));
    expect(muted.map((td) => td.textContent)).toEqual([
      "toes on a plate, pause at the top",
    ]);
  });

  it("gives a skill dose the same box and table as a main lift", () => {
    const root = renderDayScreen(
      getMockDay([
        {
          type: "movement",
          label: "Skill",
          moveName: "Toes-to-bar",
          rows: [
            { scheme: "4 sets", note: "your current rung on the Skills screen" },
            { scheme: "Rest", note: "90s" },
          ],
        },
      ]),
      nav,
    );

    const box = boxFor(root, "Skill");
    expect(box.classList.contains("main")).toBe(true);
    expect(box.querySelector(".liftname")?.textContent).toBe("Toes-to-bar");
    expect(box.querySelector(".box-list")).toBeNull();
    expect(box.querySelectorAll("table.sets tr").length).toBe(2);
  });

  it("marks Prep and Accessory prose boxes with a movement class but not narrative boxes", () => {
    const root = renderDayScreen(
      getMockDay([
        { type: "prep", label: "Prep", text: "3 rounds: a · b" },
        { type: "text", label: "Accessory", text: "x\ny" },
        { type: "text", label: "Notes", text: "just prose" },
      ]),
      nav,
    );

    expect(boxFor(root, "Prep").classList.contains("movement")).toBe(true);
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
