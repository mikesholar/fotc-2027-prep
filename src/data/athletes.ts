import planJson from "./plan.json";
import blairData from "./blair.json";
import erikData from "./erik.json";
import { parsePlan, type Plan } from "../core/schema";

export type AthleteId = "mike" | "blair" | "erik";

export type Athlete = {
  id: AthleteId;
  name: string;
  title: string;
  storageKey: string;
  skillsKey: string;
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

const erikPlan = parsePlan({
  lifts: planJson.lifts.map((lift) => ({ ...lift, isEstimate: false })),
  defaultMaxes: erikData.defaultMaxes,
  days: planJson.days,
  skills: erikData.skills,
  solidCount: erikData.solidCount,
  qualifierBlock: erikData.qualifierBlock,
});

const ATHLETES: Record<AthleteId, Athlete> = {
  mike: { id: "mike", name: "Mike", title: "FOTC 2027 Prep", storageKey: "fotc.maxes", skillsKey: "fotc.skills", plan: mikePlan },
  blair: { id: "blair", name: "Blair", title: "FOTC 2027 · Blair", storageKey: "fotc.maxes.blair", skillsKey: "fotc.skills.blair", plan: blairPlan },
  erik: { id: "erik", name: "Erik", title: "FOTC 2027 · Erik", storageKey: "fotc.maxes.erik", skillsKey: "fotc.skills.erik", plan: erikPlan },
};

export const selectAthlete = (search: string): AthleteId => {
  const requested = new URLSearchParams(search).get("athlete");
  return requested !== null && requested in ATHLETES ? (requested as AthleteId) : "mike";
};

export const getAthlete = (id: AthleteId): Athlete => ATHLETES[id];
