import type { ResolvedDay, ResolvedSection } from "../core/loads";
import { navigate } from "./router";

const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const renderMain = (s: Extract<ResolvedSection, { type: "mainLift" }>): HTMLElement => {
  const box = el("div", "box main");
  box.appendChild(el("div", "box-label", "Main Lift"));
  box.appendChild(el("div", "liftname", s.liftName));
  const table = el("table", "sets");
  for (const r of s.rows) {
    const tr = el("tr");
    tr.appendChild(el("td", "scheme", r.scheme));
    if ("load" in r) {
      tr.appendChild(el("td", "pct", `${+(r.pct * 100).toFixed(1)}%`));
      tr.appendChild(el("td", "load", `${r.load} lb`));
    } else {
      const td = el("td", "note", r.note);
      (td as HTMLTableCellElement).colSpan = 2;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  box.appendChild(table);
  return box;
};

const renderSection = (s: ResolvedSection): HTMLElement => {
  if (s.type === "mainLift") return renderMain(s);
  const box = el("div", `box ${s.type}`);
  box.appendChild(el("div", "box-label", s.label));
  const body = el("div", "box-text");
  body.textContent = s.text;
  box.appendChild(body);
  return box;
};

export const renderDayScreen = (
  day: ResolvedDay,
  nav: { prevDate: string | null; nextDate: string | null; isToday: boolean },
): HTMLElement => {
  const root = el("div", "screen day-screen");
  const picker = el("div", "picker");
  const prev = el("div", "arrow", "‹");
  if (nav.prevDate) prev.onclick = () => navigate({ name: "day", date: nav.prevDate! });
  const next = el("div", "arrow", "›");
  if (nav.nextDate) next.onclick = () => navigate({ name: "day", date: nav.nextDate! });
  const center = el("div", "center");
  center.appendChild(el("div", "date", day.dateLabel));
  center.appendChild(el("div", "wk", `${day.block} · ${typeof day.week === "number" ? "Week " + day.week : day.week}`));
  picker.append(prev, center, next);
  root.appendChild(picker);
  if (nav.isToday) root.appendChild(el("span", "today-chip", "● Today"));
  root.appendChild(el("div", "sess-title", day.sessionTitle));
  root.appendChild(el("div", "sess-sub", day.weekFocus));
  for (const s of day.sections) root.appendChild(renderSection(s));
  const link = el("a", "nav-link", "All weeks →");
  (link as HTMLAnchorElement).href = "#/schedule";
  root.appendChild(link);
  const mx = el("a", "nav-link", "Edit maxes");
  (mx as HTMLAnchorElement).href = "#/maxes";
  root.appendChild(mx);
  return root;
};
