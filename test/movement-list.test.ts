import { describe, it, expect } from "vitest";
import { parseMovementBody } from "../src/core/movement-list";

describe("parseMovementBody", () => {
  it("splits a 'N rounds:' prep line into a lead plus dot-separated bullets", () => {
    const body = parseMovementBody(
      "3 rounds: 16 goblet cossack squats (loaded heel flat) · 10 back ext off GHD · 8 reverse Nordics",
    );

    expect(body).toEqual({
      kind: "list",
      groups: [
        {
          lead: "3 rounds:",
          items: [
            "16 goblet cossack squats (loaded heel flat)",
            "10 back ext off GHD",
            "8 reverse Nordics",
          ],
        },
      ],
    });
  });

  it("merges newline-separated movements into a single lead-less bullet group", () => {
    const body = parseMovementBody(
      "3x8 Bulgarian split squats (DBs, add load weekly)\n3x12 stiff-leg deadlift @ ~40–50% of DL 1RM (deep hamstring stretch)\n3x20 kip swings (stiff midline — quality over shape size)",
    );

    expect(body).toEqual({
      kind: "list",
      groups: [
        {
          lead: null,
          items: [
            "3x8 Bulgarian split squats (DBs, add load weekly)",
            "3x12 stiff-leg deadlift @ ~40–50% of DL 1RM (deep hamstring stretch)",
            "3x20 kip swings (stiff midline — quality over shape size)",
          ],
        },
      ],
    });
  });

  it("keeps each labelled thread line as its own lead group with its own bullets", () => {
    const body = parseMovementBody(
      "PULL THREAD — TEST: 1 max set strict pull-ups (log on Benchmarks) · then E2MOM x4: 60% of that number\nHS THREAD — TEST: 1 max set strict HSPU · 4:00 max wall walks",
    );

    expect(body).toEqual({
      kind: "list",
      groups: [
        {
          lead: "PULL THREAD — TEST:",
          items: [
            "1 max set strict pull-ups (log on Benchmarks)",
            "then E2MOM x4: 60% of that number",
          ],
        },
        {
          lead: "HS THREAD — TEST:",
          items: ["1 max set strict HSPU", "4:00 max wall walks"],
        },
      ],
    });
  });

  it("treats a lone sentence note as a paragraph even when it contains a colon", () => {
    const body = parseMovementBody(
      "Week 1 mindset: this week sets every trend line for the next 6 months. RPE honesty > heroics.",
    );

    expect(body).toEqual({
      kind: "paragraph",
      text: "Week 1 mindset: this week sets every trend line for the next 6 months. RPE honesty > heroics.",
    });
  });

  it("treats a single delimiter-free movement instruction as a paragraph", () => {
    const body = parseMovementBody(
      "+ 4 reactive DB jumps after each work set (recoil off the floor, be a bouncy ball)",
    );

    expect(body).toEqual({
      kind: "paragraph",
      text: "+ 4 reactive DB jumps after each work set (recoil off the floor, be a bouncy ball)",
    });
  });

  it("does not treat a time like 1:00 as a lead label", () => {
    const body = parseMovementBody(
      "2 rounds: 15 banded straight-arm pull-downs · 10 table tops (:02 pause) · 1:00 banded lat stretch/side",
    );

    expect(body).toEqual({
      kind: "list",
      groups: [
        {
          lead: "2 rounds:",
          items: [
            "15 banded straight-arm pull-downs",
            "10 table tops (:02 pause)",
            "1:00 banded lat stretch/side",
          ],
        },
      ],
    });
  });
});
