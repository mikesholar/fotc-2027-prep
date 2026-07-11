import type { Plan } from "../core/schema";
import { formatWeekLabel } from "../core/format";
import { el } from "./dom";

type Day = Plan["days"][number];

const mainLiftLabel = (day: Day): string => {
  const m = day.sections.find((s) => s.type === "mainLift");
  return m && m.type === "mainLift" ? m.liftName : "";
};

const renderWeekHead = (day: Day, qualifierBlock?: string): HTMLElement => {
  const isQualifier = !!qualifierBlock && day.block === qualifierBlock;
  const head = el("div", isQualifier ? "wk-head q" : "wk-head");
  const left = el("div");
  const weekLabel = formatWeekLabel(day.week);
  left.append(
    el("span", "wkn", weekLabel),
    document.createTextNode(" "),
    el("span", "wkdates", day.weekDates),
  );
  if (isQualifier) {
    head.append(left, el("span", "qtarget", "🎯 Qualifier"));
  } else if (!weekLabel.startsWith(day.block)) {
    head.append(left, el("div", "wkblock", day.block));
  } else {
    head.append(left);
  }
  return head;
};

const renderDayRow = (day: Day, isToday: boolean): HTMLElement => {
  const row = el("a", isToday ? "dayrow today" : "dayrow");
  (row as HTMLAnchorElement).href = `#/day/${day.date}`;

  const dow = el("div", "dow");
  dow.append(
    document.createTextNode(day.dow),
    el("br"),
    document.createTextNode(day.dateLabel.replace(/^[A-Za-z]{3}\s/, "")),
  );

  const sess = el("div", "sess");
  sess.append(document.createTextNode(day.sessionTitle));
  const lift = mainLiftLabel(day);
  if (lift) sess.append(el("div", "lift", lift));

  row.append(dow, sess, el("div", "chev", "›"));
  return row;
};

export const renderScheduleScreen = (plan: Plan, todayDate: string): HTMLElement => {
  const root = el("div", "screen schedule-screen");
  root.appendChild(el("div", "scr-title", "Schedule"));
  let currentWeek: string | number | null = null;
  for (const day of plan.days) {
    if (day.week !== currentWeek) {
      currentWeek = day.week;
      root.appendChild(renderWeekHead(day, plan.qualifierBlock));
      root.appendChild(el("div", "wk-focus", day.weekFocus));
    }
    root.appendChild(renderDayRow(day, day.date === todayDate));
  }
  return root;
};
