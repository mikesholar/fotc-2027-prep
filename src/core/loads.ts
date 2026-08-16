import type { Day, Maxes, Section } from "./schema";

export const computeLoad = (pct: number, max: number): number =>
  Math.round((pct * max) / 5) * 5;

export type MainRow =
  | { scheme: string; pct: number; load: number }
  | { scheme: string; note: string };

export type ResolvedMainLift = {
  type: "mainLift"; label: string; liftName: string; rows: MainRow[];
};
export type ResolvedMovement = {
  type: "movement"; label: string; moveName: string; rows: MainRow[];
};
export type ResolvedSection =
  | { type: "prep"; label: string; text: string }
  | { type: "text"; label: string; text: string }
  | ResolvedMainLift
  | ResolvedMovement;
export type ResolvedDay = Omit<Day, "sections"> & { sections: ResolvedSection[] };

const resolveSection = (section: Section, maxes: Maxes): ResolvedSection => {
  if (section.type !== "mainLift") return section;
  const rows: MainRow[] = section.sets.map((set) =>
    "pct" in set
      ? { scheme: set.scheme, pct: set.pct, load: computeLoad(set.pct, maxes[section.liftKey]) }
      : { scheme: set.scheme, note: set.note });
  return { type: "mainLift", label: section.label, liftName: section.liftName, rows };
};

export const resolveDay = (day: Day, maxes: Maxes): ResolvedDay => ({
  ...day,
  sections: day.sections.map((s) => resolveSection(s, maxes)),
});
