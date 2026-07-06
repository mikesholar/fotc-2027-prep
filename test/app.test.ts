import { describe, it, expect, beforeEach } from "vitest";
import { startApp } from "../src/ui/app";

describe("app bootstrap", () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = "";
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("renders and navigates to a day route on first load", () => {
    const mount = document.querySelector<HTMLDivElement>("#app")!;
    startApp(mount);
    expect(window.location.hash).toMatch(/^#\/day\/\d{4}-\d{2}-\d{2}$/);
    expect(mount.querySelector(".picker")).not.toBeNull();
  });

  it("renders the maxes screen with 7 lift inputs", () => {
    window.location.hash = "#/maxes";
    const mount = document.querySelector<HTMLDivElement>("#app")!;
    startApp(mount);
    expect(mount.querySelectorAll("input").length).toBe(7);
  });

  it("renders the schedule with week headers", () => {
    window.location.hash = "#/schedule";
    const mount = document.querySelector<HTMLDivElement>("#app")!;
    startApp(mount);
    expect(mount.querySelectorAll(".wk-head").length).toBeGreaterThan(10);
  });
});
