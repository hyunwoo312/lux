export function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getMonthOffset(monthDate: Date, offset: number): Date {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getMonthGridDays(monthDate: Date): Date[] {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstGridDay = new Date(monthStart);
  firstGridDay.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + index);
    return date;
  });
}

export function getRangeEndDate(startDate: Date, lookaheadDays: number): Date {
  return addDays(startDate, Math.max(1, lookaheadDays) - 1);
}
