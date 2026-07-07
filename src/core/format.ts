export const formatWeekLabel = (week: number | string): string =>
  typeof week === "number" ? `Week ${week}` : `Ramp-In ${week}`;
