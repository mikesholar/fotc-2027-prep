import { z } from "zod";

export type SkillsProgress = Record<string, Record<string, boolean>>;

const SkillsProgressSchema = z.record(z.string(), z.record(z.string(), z.boolean()));

export const loadProgress = (key: string): SkillsProgress => {
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  try {
    return SkillsProgressSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
};

export const saveProgress = (progress: SkillsProgress, key: string): void => {
  localStorage.setItem(key, JSON.stringify(progress));
};

export const toggleStep = (
  progress: SkillsProgress,
  movement: string,
  index: number,
): SkillsProgress => {
  const current = progress[movement] ?? {};
  const stepKey = String(index);
  return { ...progress, [movement]: { ...current, [stepKey]: !current[stepKey] } };
};

export const doneCount = (progress: SkillsProgress, movement: string): number =>
  Object.values(progress[movement] ?? {}).filter(Boolean).length;
