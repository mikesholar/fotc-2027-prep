import { z } from "zod";

export const LIFT_KEYS = [
  "backSquat", "frontSquat", "bench", "strictPress",
  "deadlift", "cleanJerk", "snatch",
] as const;

export const LiftKeySchema = z.enum(LIFT_KEYS);
export type LiftKey = z.infer<typeof LiftKeySchema>;

const PctSet = z.object({ scheme: z.string(), pct: z.number(), expectedLoad: z.number() });
const NoteSet = z.object({ scheme: z.string(), note: z.string() });
const SetSchema = z.union([PctSet, NoteSet]);

const PrepSection = z.object({ type: z.literal("prep"), label: z.string(), text: z.string() });
const TextSection = z.object({ type: z.literal("text"), label: z.string(), text: z.string() });
const MainLiftSection = z.object({
  type: z.literal("mainLift"), label: z.string(),
  liftName: z.string(), liftKey: LiftKeySchema, sets: z.array(SetSchema),
});
const MovementSection = z.object({
  type: z.literal("movement"), label: z.string(),
  moveName: z.string(), rows: z.array(NoteSet),
});
export const SectionSchema = z.union([PrepSection, MainLiftSection, MovementSection, TextSection]);
export type Section = z.infer<typeof SectionSchema>;

export const DaySchema = z.object({
  date: z.string(), dow: z.string(), dateLabel: z.string(),
  block: z.string(), week: z.union([z.number(), z.string()]),
  weekDates: z.string(), weekFocus: z.string(),
  sessionTitle: z.string(), sections: z.array(SectionSchema),
});
export type Day = z.infer<typeof DaySchema>;

export const SkillStepSchema = z.object({
  move: z.string(),
  rx: z.string().optional(),
  gate: z.string().optional(),
});
export type SkillStep = z.infer<typeof SkillStepSchema>;

export const SkillSchema = z.object({
  movement: z.string(),
  status: z.enum(["No", "Some"]),
  progression: z.array(SkillStepSchema).min(1),
  cue: z.string().optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const PlanSchema = z.object({
  lifts: z.array(z.object({ key: LiftKeySchema, name: z.string(), isEstimate: z.boolean() })),
  defaultMaxes: z.record(LiftKeySchema, z.number()),
  days: z.array(DaySchema),
  skills: z.array(SkillSchema).optional(),
  skillsNote: z.string().optional(),
  solidCount: z.number().optional(),
  qualifierBlock: z.string().optional(),
});
export type Plan = z.infer<typeof PlanSchema>;
export type Maxes = Record<LiftKey, number>;

export const parsePlan = (data: unknown): Plan => PlanSchema.parse(data);
