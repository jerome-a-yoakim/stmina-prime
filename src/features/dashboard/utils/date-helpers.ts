export function isFriday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 5;
}

export function getNextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 7 - day + 5;
  d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
  return d.toISOString().slice(0, 10);
}
