import { z } from "zod";
import { LIFT_KEYS, type Maxes } from "./schema";

const KEY = "fotc.maxes";
const MaxesSchema = z.object(
  Object.fromEntries(LIFT_KEYS.map((k) => [k, z.number().positive()])) as
    Record<(typeof LIFT_KEYS)[number], z.ZodNumber>,
);

export const loadMaxes = (defaults: Maxes, key: string = KEY): Maxes => {
  const raw = localStorage.getItem(key);
  if (!raw) return defaults;
  try {
    return MaxesSchema.parse(JSON.parse(raw));
  } catch {
    return defaults;
  }
};

export const saveMaxes = (maxes: Maxes, key: string = KEY): void => {
  localStorage.setItem(key, JSON.stringify(maxes));
};
