import type { Plan } from "../core/schema";
import { type SkillsProgress, doneCount } from "../core/skills-store";
import { el } from "./dom";

const chipFor = (done: number, total: number): { cls: string; text: string } => {
  if (done === 0) return { cls: "chip no", text: "Not yet" };
  if (done >= total) return { cls: "chip got", text: "Got it ✓" };
  return { cls: "chip some", text: `Building · ${done}/${total}` };
};

export const renderSkillsScreen = (
  plan: Plan,
  backDate: string,
  progress: SkillsProgress,
  onToggle: (movement: string, index: number) => void,
): HTMLElement => {
  const root = el("div", "screen skills-screen");
  root.appendChild(el("div", "scr-title", "Skills"));
  root.appendChild(el("div", "scr-sub",
    "Close these before the Qualifier — Week 11. Clear a rung's gate, then tick it."));

  const skills = plan.skills ?? [];
  for (const skill of skills) {
    const checked = progress[skill.movement] ?? {};
    const total = skill.progression.length;
    const done = doneCount(progress, skill.movement);
    const currentIndex = skill.progression.findIndex((_, i) => !checked[String(i)]);

    const card = el("div", "skill");
    const top = el("div", "skill-top");
    const chip = chipFor(done, total);
    top.append(el("span", "skill-name", skill.movement), el("span", chip.cls, chip.text));
    card.appendChild(top);

    const bar = el("div", "bar");
    const fill = el("i");
    fill.style.width = `${(done / total) * 100}%`;
    bar.appendChild(fill);
    card.appendChild(bar);

    const ladder = el("div", "ladder");
    skill.progression.forEach((step, i) => {
      const isDone = !!checked[String(i)];
      const isCurrent = i === currentIndex;
      const row = el("div", `step${isDone ? " done" : ""}${isCurrent ? " current" : ""}`);
      row.setAttribute("role", "checkbox");
      row.setAttribute("aria-checked", String(isDone));
      row.setAttribute("tabindex", "0");

      const rung = el("div", "rung");
      rung.append(el("div", "node"), el("div", "line"));

      const body = el("div", "body");
      const move = el("div", "move");
      move.append(el("span", "lvl", `L${i + 1}`), document.createTextNode(step.move));
      if (isCurrent) move.appendChild(el("span", "now", "Now"));
      body.appendChild(move);
      if (step.rx) body.appendChild(el("div", "rx", step.rx));
      if (step.gate) {
        const gate = el("div", "gate");
        gate.append(el("b", undefined, "Advance: "), document.createTextNode(step.gate));
        body.appendChild(gate);
      }

      row.append(rung, body);
      const toggle = (): void => onToggle(skill.movement, i);
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          toggle();
        }
      });
      ladder.appendChild(row);
    });
    card.appendChild(ladder);

    if (skill.cue) card.appendChild(el("div", "skill-cue", skill.cue));
    root.appendChild(card);
  }

  if (typeof plan.solidCount === "number") {
    const total = plan.solidCount + skills.length;
    root.appendChild(el("div", "solid-note",
      `✓ ${plan.solidCount} of ${total} Novice movements already solid`));
  }

  const back = el("a", "nav-link", "← Back to day");
  (back as HTMLAnchorElement).href = `#/day/${backDate}`;
  root.appendChild(back);
  return root;
};
