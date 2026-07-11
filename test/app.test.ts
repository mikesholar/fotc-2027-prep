import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startApp } from "../src/ui/app";
import planJson from "../src/data/plan.json";
import { parsePlan, type Maxes } from "../src/core/schema";
import { loadMaxes } from "../src/core/maxes-store";

const plan = parsePlan(planJson);
const defaults = plan.defaultMaxes as Maxes;

const mountApp = (): HTMLDivElement => {
  const mount = document.querySelector<HTMLDivElement>("#app")!;
  startApp(mount);
  return mount;
};

const setInput = (input: HTMLInputElement, value: string): void => {
  input.value = value;
  input.dispatchEvent(new Event("input"));
};

describe("app bootstrap", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "";
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("renders and navigates to a day route on first load", () => {
    const mount = mountApp();
    expect(window.location.hash).toMatch(/^#\/day\/\d{4}-\d{2}-\d{2}$/);
    expect(mount.querySelector(".picker")).not.toBeNull();
  });

  it("renders the maxes screen with 7 lift inputs", () => {
    window.location.hash = "#/maxes";
    const mount = mountApp();
    expect(mount.querySelectorAll("input").length).toBe(7);
  });

  it("renders the schedule with week headers", () => {
    window.location.hash = "#/schedule";
    const mount = mountApp();
    expect(mount.querySelectorAll(".wk-head").length).toBeGreaterThan(10);
  });
});

describe("editing maxes", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "#/maxes";
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("persists edits to two different maxes without reverting the first", () => {
    const mount = mountApp();
    const inputs = mount.querySelectorAll<HTMLInputElement>(".maxrow input");

    setInput(inputs[0], "999");
    setInput(inputs[1], "888");

    const stored = loadMaxes(defaults);
    expect(stored.backSquat).toBe(999);
    expect(stored.frontSquat).toBe(888);
  });

  it("restores default maxes when reset is clicked", () => {
    const mount = mountApp();
    const inputs = mount.querySelectorAll<HTMLInputElement>(".maxrow input");
    setInput(inputs[0], "999");
    expect(loadMaxes(defaults).backSquat).toBe(999);

    mount.querySelector<HTMLButtonElement>(".reset")!.click();

    expect(loadMaxes(defaults).backSquat).toBe(defaults.backSquat);
    const rerendered = mount.querySelectorAll<HTMLInputElement>(".maxrow input");
    expect(rerendered[0].value).toBe(String(defaults.backSquat));
  });
});

describe("day navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("moves to the next day when the next arrow is clicked", () => {
    const dates = plan.days.map((d) => d.date);
    const idx = 10;
    window.location.hash = `#/day/${dates[idx]}`;
    const mount = mountApp();

    mount.querySelectorAll<HTMLElement>(".picker .arrow")[1].click();
    expect(window.location.hash).toBe(`#/day/${dates[idx + 1]}`);
  });

  it("moves to the previous day when the prev arrow is clicked", () => {
    const dates = plan.days.map((d) => d.date);
    const idx = 10;
    window.location.hash = `#/day/${dates[idx]}`;
    const mount = mountApp();

    mount.querySelectorAll<HTMLElement>(".picker .arrow")[0].click();
    expect(window.location.hash).toBe(`#/day/${dates[idx - 1]}`);
  });

  it("disables the prev arrow on the first day and next arrow on the last", () => {
    const dates = plan.days.map((d) => d.date);

    window.location.hash = `#/day/${dates[0]}`;
    const first = mountApp();
    const firstArrows = first.querySelectorAll<HTMLElement>(".picker .arrow");
    expect(firstArrows[0].classList.contains("disabled")).toBe(true);
    expect(firstArrows[1].classList.contains("disabled")).toBe(false);

    window.location.hash = `#/day/${dates[dates.length - 1]}`;
    const last = mountApp();
    const lastArrows = last.querySelectorAll<HTMLElement>(".picker .arrow");
    expect(lastArrows[0].classList.contains("disabled")).toBe(false);
    expect(lastArrows[1].classList.contains("disabled")).toBe(true);
  });
});

describe("loads reflect the edited max", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("recomputes a back-squat load from a changed max", () => {
    window.location.hash = "#/maxes";
    const mount = mountApp();
    const backSquatInput = mount.querySelectorAll<HTMLInputElement>(".maxrow input")[0];
    setInput(backSquatInput, "300");

    window.location.hash = "#/day/2026-07-20";
    const dayMount = mountApp();

    const loads = Array.from(dayMount.querySelectorAll(".sets .load")).map(
      (td) => td.textContent,
    );
    const expected = Math.round((0.8 * 300) / 5) * 5;
    expect(loads).toContain(`${expected} lb`);
  });
});

describe("blair's page", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, "", "/?athlete=blair");
    window.location.hash = "#/maxes";
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("mounts blair's plan with her default max and title", () => {
    const mount = mountApp();
    const first = mount.querySelector<HTMLInputElement>(".maxrow input")!;
    expect(first.value).toBe("205");
    expect(document.title).toBe("FOTC 2027 · Blair");
  });

  it("stores edits under blair's key, never mike's", () => {
    const mount = mountApp();
    setInput(mount.querySelector<HTMLInputElement>(".maxrow input")!, "210");
    expect(localStorage.getItem("fotc.maxes.blair")).toContain("210");
    expect(localStorage.getItem("fotc.maxes")).toBeNull();
  });

  it("offers a Skills link on a day and renders three skill cards", () => {
    window.location.hash = "#/day/2026-09-28";
    const dayMount = mountApp();
    const link = Array.from(dayMount.querySelectorAll("a.nav-link")).find((a) => a.textContent === "Skills →");
    expect(link).toBeTruthy();

    window.location.hash = "#/skills";
    const skillsMount = mountApp();
    expect(skillsMount.querySelectorAll(".skill").length).toBe(3);
  });

  it("sends the skills back link to a day, not the schedule", () => {
    window.location.hash = "#/skills";
    const mount = mountApp();
    const back = Array.from(mount.querySelectorAll<HTMLAnchorElement>("a.nav-link"))
      .find((a) => a.textContent?.startsWith("←"))!;
    const href = back.getAttribute("href")!;
    expect(href).toMatch(/^#\/day\/\d{4}-\d{2}-\d{2}$/);
    expect(href).not.toBe("#/schedule");
  });

  it("persists a ticked rung under blair's skills key and updates the chip", () => {
    window.location.hash = "#/skills";
    const mount = mountApp();

    expect(mount.querySelector(".chip")?.textContent).toBe("Not yet");
    mount.querySelector<HTMLElement>(".step")!.click();

    expect(mount.querySelector(".chip")?.textContent).toContain("Building");
    expect(localStorage.getItem("fotc.skills.blair")).toContain("Pull-ups");
    expect(localStorage.getItem("fotc.skills")).toBeNull();
  });

  it("marks the qualifier block on her schedule", () => {
    window.location.hash = "#/schedule";
    const mount = mountApp();
    expect(mount.querySelector(".qtarget")).not.toBeNull();
    expect(mount.querySelector(".wk-head.q")).not.toBeNull();
  });
});

describe("mike's page has no skills affordance", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, "", "/");
  });

  it("shows no Skills link and redirects #/skills to a day", () => {
    window.location.hash = "#/day/2026-09-28";
    const mount = mountApp();
    const link = Array.from(mount.querySelectorAll("a.nav-link")).find((a) => a.textContent === "Skills →");
    expect(link).toBeUndefined();

    window.location.hash = "#/skills";
    mountApp();
    expect(window.location.hash).toMatch(/^#\/day\/\d{4}-\d{2}-\d{2}$/);
  });

  it("shows no qualifier marker on his schedule", () => {
    window.location.hash = "#/schedule";
    const mount = mountApp();
    expect(mount.querySelector(".qtarget")).toBeNull();
  });
});
