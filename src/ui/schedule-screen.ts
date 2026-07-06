import type { Plan } from "../core/schema";

const mainLiftLabel = (day: Plan["days"][number]): string => {
  const m = day.sections.find((s) => s.type === "mainLift");
  return m && m.type === "mainLift" ? m.liftName : day.sessionTitle;
};

export const renderScheduleScreen = (plan: Plan, todayDate: string): HTMLElement => {
  const root = document.createElement("div");
  root.className = "screen schedule-screen";
  root.innerHTML = `<div class="scr-title">Schedule</div>`;
  let currentWeek: string | number | null = null;
  for (const day of plan.days) {
    if (day.week !== currentWeek) {
      currentWeek = day.week;
      const head = document.createElement("div");
      head.className = "wk-head";
      const label = typeof day.week === "number" ? `Week ${day.week}` : `Ramp-In ${day.week}`;
      head.innerHTML = `<div><span class="wkn">${label}</span> <span class="wkdates">${day.weekDates}</span></div><div class="wkblock">${day.block}</div>`;
      root.appendChild(head);
      const focus = document.createElement("div");
      focus.className = "wk-focus"; focus.textContent = day.weekFocus;
      root.appendChild(focus);
    }
    const rowLink = document.createElement("a");
    rowLink.className = "dayrow" + (day.date === todayDate ? " today" : "");
    rowLink.href = `#/day/${day.date}`;
    rowLink.innerHTML =
      `<div class="dow">${day.dow}<br>${day.dateLabel.replace(/^[A-Za-z]{3}\s/, "")}</div>` +
      `<div class="sess">${day.sessionTitle}<div class="lift">${mainLiftLabel(day)}</div></div>` +
      `<div class="chev">›</div>`;
    root.appendChild(rowLink);
  }
  return root;
};
