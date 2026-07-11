import type { Plan } from "../core/schema";
import { el } from "./dom";

const CHIP_TEXT: Record<"No" | "Some", string> = { No: "Not yet", Some: "Building" };
const CHIP_CLASS: Record<"No" | "Some", string> = { No: "chip no", Some: "chip some" };

export const renderSkillsScreen = (plan: Plan): HTMLElement => {
  const root = el("div", "screen skills-screen");
  root.appendChild(el("div", "scr-title", "Skills"));
  root.appendChild(el("div", "scr-sub",
    "Close these before the Qualifier — Week 11. Work 2–3×/week before class."));

  const skills = plan.skills ?? [];
  for (const skill of skills) {
    const card = el("div", "skill");
    const top = el("div", "skill-top");
    top.append(
      el("span", "skill-name", skill.movement),
      el("span", CHIP_CLASS[skill.status], CHIP_TEXT[skill.status]),
    );
    card.appendChild(top);

    const ladder = el("div", "ladder");
    for (const step of skill.progression) {
      const row = el("div", "step");
      const rung = el("div", "rung");
      rung.append(el("div", "node"), el("div", "line"));
      row.append(rung, el("div", "txt", step));
      ladder.appendChild(row);
    }
    card.appendChild(ladder);

    if (skill.cue) card.appendChild(el("div", "skill-cue", skill.cue));
    root.appendChild(card);
  }

  if (typeof plan.solidCount === "number") {
    const total = plan.solidCount + skills.length;
    root.appendChild(el("div", "solid-note",
      `✓ ${plan.solidCount} of ${total} Novice movements already solid`));
  }

  const back = el("a", "nav-link", "← Back to schedule");
  (back as HTMLAnchorElement).href = "#/schedule";
  root.appendChild(back);
  return root;
};
