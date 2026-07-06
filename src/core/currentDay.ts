export const pickCurrentDay = (sortedDates: string[], today: string): string => {
  if (sortedDates.length === 0) throw new Error("no days");
  if (today <= sortedDates[0]) return sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  if (today >= last) return last;
  return sortedDates.find((d) => d >= today) ?? last;
};

export const todayIso = (now: Date = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
