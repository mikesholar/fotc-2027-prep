import planJson from "../data/plan.json";
import { parsePlan, type Maxes } from "../core/schema";
import { resolveDay } from "../core/loads";
import { pickCurrentDay, todayIso } from "../core/currentDay";
import { loadMaxes, saveMaxes } from "../core/maxes-store";
import { parseRoute, navigate, onRouteChange } from "./router";
import { renderDayScreen } from "./day-screen";
import { renderMaxesScreen } from "./maxes-screen";
import { renderScheduleScreen } from "./schedule-screen";

export const startApp = (mount: HTMLElement): void => {
  const plan = parsePlan(planJson);
  const dates = plan.days.map((d) => d.date);
  const defaultMaxes = plan.defaultMaxes as Maxes;
  let maxes: Maxes = loadMaxes(defaultMaxes);

  const render = (): void => {
    const route = parseRoute(window.location.hash);
    if (!route) {
      navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) });
      render();
      return;
    }
    mount.innerHTML = "";
    if (route.name === "maxes") {
      mount.appendChild(renderMaxesScreen(plan, maxes,
        (key, value) => { maxes = { ...maxes, [key]: value }; saveMaxes(maxes); },
        () => { maxes = { ...defaultMaxes }; saveMaxes(maxes); render(); }));
    } else if (route.name === "schedule") {
      mount.appendChild(renderScheduleScreen(plan, todayIso()));
    } else {
      const idx = dates.indexOf(route.date);
      const day = plan.days[idx];
      if (!day) { navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) }); return; }
      mount.appendChild(renderDayScreen(resolveDay(day, maxes), {
        prevDate: idx > 0 ? dates[idx - 1] : null,
        nextDate: idx < dates.length - 1 ? dates[idx + 1] : null,
        isToday: route.date === todayIso(),
      }));
    }
    if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
  };

  onRouteChange(render);
  render();
};
