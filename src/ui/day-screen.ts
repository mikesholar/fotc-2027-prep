import type { MainRow, ResolvedDay, ResolvedSection } from "../core/loads";
import { formatWeekLabel } from "../core/format";
import { parseMovementBody, type MovementGroup } from "../core/movement-list";
import { el } from "./dom";
import { navigate } from "./router";

const MOVEMENT_LABELS = new Set(["Prep", "Skill", "Accessory"]);

const makeArrow = (glyph: string, label: string, date: string | null): HTMLElement => {
  const arrow = el("div", date ? "arrow" : "arrow disabled", glyph);
  arrow.setAttribute("role", "button");
  arrow.setAttribute("tabindex", "0");
  arrow.setAttribute("aria-label", label);
  if (date) arrow.onclick = () => navigate({ name: "day", date });
  return arrow;
};

const renderLiftBox = (label: string, name: string, rows: MainRow[]): HTMLElement => {
  const box = el("div", "box main");
  box.appendChild(el("div", "box-label", label));
  box.appendChild(el("div", "liftname", name));
  const table = el("table", "sets");
  for (const r of rows) {
    const tr = el("tr");
    if ("load" in r) {
      const pctLabel = `${+(r.pct * 100).toFixed(1)}%`;
      if (r.scheme) {
        tr.appendChild(el("td", "scheme", r.scheme));
        tr.appendChild(el("td", "pct", pctLabel));
      } else {
        const td = el("td", "pct", pctLabel);
        (td as HTMLTableCellElement).colSpan = 2;
        tr.appendChild(td);
      }
      tr.appendChild(el("td", "load", `${r.load} lb`));
    } else {
      tr.appendChild(el("td", "scheme", r.scheme));
      const td = el("td", "note", r.note);
      (td as HTMLTableCellElement).colSpan = 2;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  box.appendChild(table);
  return box;
};

const renderMovementGroup = (group: MovementGroup): HTMLElement[] => {
  const nodes: HTMLElement[] = [];
  if (group.lead) nodes.push(el("div", "box-lead", group.lead));
  const list = el("ul", "box-list");
  for (const item of group.items) list.appendChild(el("li", undefined, item));
  nodes.push(list);
  return nodes;
};

const renderMovementBody = (text: string): HTMLElement[] => {
  const body = parseMovementBody(text);
  if (body.kind === "paragraph") return [el("div", "box-text", body.text)];
  return body.groups.flatMap(renderMovementGroup);
};

const renderSection = (s: ResolvedSection): HTMLElement => {
  if (s.type === "mainLift") return renderLiftBox(s.label, s.liftName, s.rows);
  if (s.type === "movement") return renderLiftBox(s.label, s.moveName, s.rows);
  const isMovement = MOVEMENT_LABELS.has(s.label);
  const box = el("div", `box ${s.type}${isMovement ? " movement" : ""}`);
  box.appendChild(el("div", "box-label", s.label));
  const bodyNodes = isMovement
    ? renderMovementBody(s.text)
    : [el("div", "box-text", s.text)];
  for (const node of bodyNodes) box.appendChild(node);
  return box;
};

export const renderDayScreen = (
  day: ResolvedDay,
  nav: { prevDate: string | null; nextDate: string | null; isToday: boolean; hasSkills?: boolean },
): HTMLElement => {
  const root = el("div", "screen day-screen");
  const picker = el("div", "picker");
  const prev = makeArrow("‹", "Previous day", nav.prevDate);
  const next = makeArrow("›", "Next day", nav.nextDate);
  const center = el("div", "center");
  center.appendChild(el("div", "date", day.dateLabel));
  const weekLabel = formatWeekLabel(day.week);
  const context = weekLabel.startsWith(day.block) ? weekLabel : `${day.block} · ${weekLabel}`;
  center.appendChild(el("div", "wk", context));
  picker.append(prev, center, next);
  root.appendChild(picker);
  if (nav.isToday) root.appendChild(el("span", "today-chip", "● Today"));
  root.appendChild(el("div", "sess-title", day.sessionTitle));
  root.appendChild(el("div", "sess-sub", day.weekFocus));
  for (const s of day.sections) root.appendChild(renderSection(s));
  if (nav.hasSkills) {
    const skills = el("a", "nav-link", "Skills →");
    (skills as HTMLAnchorElement).href = "#/skills";
    root.appendChild(skills);
  }
  const link = el("a", "nav-link", "All weeks →");
  (link as HTMLAnchorElement).href = "#/schedule";
  root.appendChild(link);
  const mx = el("a", "nav-link", "Edit maxes");
  (mx as HTMLAnchorElement).href = "#/maxes";
  root.appendChild(mx);
  return root;
};
