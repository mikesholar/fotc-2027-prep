import planJson from "./plan.json";
import blairData from "./blair.json";
import { parsePlan, type Plan } from "../core/schema";

export type AthleteId = "mike" | "blair";

export type Athlete = {
  id: AthleteId;
  name: string;
  title: string;
  storageKey: string;
  plan: Plan;
};

const mikePlan = parsePlan(planJson);

const blairPlan = parsePlan({
  lifts: planJson.lifts.map((lift) => ({ ...lift, isEstimate: false })),
  defaultMaxes: blairData.defaultMaxes,
  days: planJson.days,
  skills: blairData.skills,
  solidCount: blairData.solidCount,
  qualifierBlock: blairData.qualifierBlock,
});

const ATHLETES: Record<AthleteId, Athlete> = {
  mike: { id: "mike", name: "Mike", title: "FOTC 2027 Prep", storageKey: "fotc.maxes", plan: mikePlan },
  blair: { id: "blair", name: "Blair", title: "FOTC 2027 · Blair", storageKey: "fotc.maxes.blair", plan: blairPlan },
};

export const selectAthlete = (search: string): AthleteId => {
  const requested = new URLSearchParams(search).get("athlete");
  return requested !== null && requested in ATHLETES ? (requested as AthleteId) : "mike";
};

export const getAthlete = (id: AthleteId): Athlete => ATHLETES[id];
