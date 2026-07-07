import type { Plan, Maxes, LiftKey } from "../core/schema";

export const renderMaxesScreen = (
  plan: Plan, maxes: Maxes,
  onChange: (key: LiftKey, value: number) => void, onReset: () => void,
): HTMLElement => {
  const root = document.createElement("div");
  root.className = "screen maxes-screen";
  root.innerHTML = `<div class="scr-title">Your Maxes</div>
    <div class="scr-sub">Every load recalculates automatically, rounded to the nearest 5 lb. Nothing leaves your phone.</div>`;
  for (const lift of plan.lifts) {
    const row = document.createElement("label");
    row.className = "maxrow";
    const name = document.createElement("div");
    name.className = "lift";
    name.textContent = lift.name;
    if (lift.isEstimate) {
      const est = document.createElement("span");
      est.className = "est"; est.textContent = "Estimate · test Wk 20";
      name.appendChild(est);
    }
    const wrap = document.createElement("div");
    wrap.className = "maxinput";
    const input = document.createElement("input");
    input.type = "number"; input.inputMode = "numeric";
    input.value = String(maxes[lift.key]);
    input.oninput = () => {
      const v = Number(input.value);
      if (v > 0) onChange(lift.key, v);
    };
    const unit = document.createElement("span");
    unit.className = "unit"; unit.textContent = "lb";
    wrap.append(input, unit);
    row.append(name, wrap);
    root.appendChild(row);
  }
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "reset"; reset.textContent = "Reset to example maxes";
  reset.onclick = onReset;
  root.appendChild(reset);
  const back = document.createElement("a");
  back.className = "nav-link"; back.href = "#/schedule"; back.textContent = "View schedule →";
  root.appendChild(back);
  return root;
};
