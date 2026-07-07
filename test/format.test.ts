import { describe, it, expect } from "vitest";
import { formatWeekLabel } from "../src/core/format";

describe("formatWeekLabel", () => {
  it("labels numeric weeks as 'Week N'", () => {
    expect(formatWeekLabel(1)).toBe("Week 1");
    expect(formatWeekLabel(26)).toBe("Week 26");
  });

  it("labels string ramp-in weeks as 'Ramp-In X'", () => {
    expect(formatWeekLabel("R1")).toBe("Ramp-In R1");
    expect(formatWeekLabel("R5")).toBe("Ramp-In R5");
  });
});
