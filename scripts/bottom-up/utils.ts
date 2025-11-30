export const quarterLabel = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} Q${q}`;
};

export const findYoy = (history: { date: Date; eps: number; period?: string }[]) => {
  // Prefer Yahoo's period flag "-4q" if present, else fall back to date delta.
  const latest = history[0];
  if (!latest) return null;
  const direct = history.find((h) => h.period === "-4q" || h.period === "4q");
  if (direct && direct !== latest) return direct;

  const target = new Date(latest.date);
  target.setFullYear(target.getFullYear() - 1);
  const match = history.find((h) => Math.abs(h.date.getTime() - target.getTime()) < 75 * 24 * 3600 * 1000);
  return match ?? null;
};
