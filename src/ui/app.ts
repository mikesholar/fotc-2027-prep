import { resolveDay } from "../core/loads";
import { pickCurrentDay, todayIso } from "../core/currentDay";
import { loadMaxes, saveMaxes } from "../core/maxes-store";
import { loadProgress, saveProgress, toggleStep } from "../core/skills-store";
import { parseRoute, navigate, onRouteChange } from "./router";
import { renderDayScreen } from "./day-screen";
import { renderMaxesScreen } from "./maxes-screen";
import { renderScheduleScreen } from "./schedule-screen";
import { renderSkillsScreen } from "./skills-screen";
import { selectAthlete, getAthlete } from "../data/athletes";
import type { Maxes } from "../core/schema";

export const startApp = (mount: HTMLElement): void => {
  const athlete = getAthlete(selectAthlete(window.location.search));
  document.title = athlete.title;
  const plan = athlete.plan;
  const dates = plan.days.map((d) => d.date);
  const defaultMaxes = plan.defaultMaxes as Maxes;
  const hasSkills = (plan.skills?.length ?? 0) > 0;
  let maxes: Maxes = loadMaxes(defaultMaxes, athlete.storageKey);
  let progress = loadProgress(athlete.skillsKey);
  let lastDayDate = pickCurrentDay(dates, todayIso());

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
        (key, value) => { maxes = { ...maxes, [key]: value }; saveMaxes(maxes, athlete.storageKey); },
        () => { maxes = { ...defaultMaxes }; saveMaxes(maxes, athlete.storageKey); render(); }));
    } else if (route.name === "schedule") {
      mount.appendChild(renderScheduleScreen(plan, todayIso()));
    } else if (route.name === "skills") {
      if (!hasSkills) { navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) }); return; }
      mount.appendChild(renderSkillsScreen(plan, lastDayDate, progress, (movement, index) => {
        progress = toggleStep(progress, movement, index);
        saveProgress(progress, athlete.skillsKey);
        render();
      }));
    } else {
      const idx = dates.indexOf(route.date);
      const day = plan.days[idx];
      if (!day) { navigate({ name: "day", date: pickCurrentDay(dates, todayIso()) }); return; }
      lastDayDate = route.date;
      mount.appendChild(renderDayScreen(resolveDay(day, maxes), {
        prevDate: idx > 0 ? dates[idx - 1] : null,
        nextDate: idx < dates.length - 1 ? dates[idx + 1] : null,
        isToday: route.date === todayIso(),
        hasSkills,
      }));
    }
    if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
  };

  onRouteChange(render);
  render();
};
