const WEEKS_IN_YEAR = 53;
const MIN_WEEKS = 26;
const MAX_CELL = 11;
const MIN_CELL = 5;
const WEEKDAY_LABEL_MIN_CELL = 9;

export const WEEKDAY_W = 22;
export const MONTH_ROW_H = 14;
export const LEGEND_H = 16;

export type HeatmapMetrics = {
  cell: number;
  gap: number;
  showWeekdays: boolean;
  weeks: number;
};

function gapFor(cell: number): number {
  if (cell >= 9) return 3;
  if (cell >= 7) return 2;
  return 1;
}

function weeksThatFit(available: number, cell: number, gap: number, showWeekdays: boolean): number {
  const grid = showWeekdays ? available - WEEKDAY_W - gap : available;
  return Math.max(1, Math.min(WEEKS_IN_YEAR, Math.floor((grid + gap) / (cell + gap))));
}

export function heatmapMetrics(available: number): HeatmapMetrics {
  if (available <= 0) {
    return { cell: MAX_CELL, gap: gapFor(MAX_CELL), showWeekdays: true, weeks: WEEKS_IN_YEAR };
  }
  for (let cell = MAX_CELL; cell >= MIN_CELL; cell -= 1) {
    const gap = gapFor(cell);
    const showWeekdays = cell >= WEEKDAY_LABEL_MIN_CELL;
    const weeks = weeksThatFit(available, cell, gap, showWeekdays);
    if (weeks >= MIN_WEEKS) return { cell, gap, showWeekdays, weeks };
  }
  const gap = gapFor(MIN_CELL);
  return {
    cell: MIN_CELL,
    gap,
    showWeekdays: false,
    weeks: weeksThatFit(available, MIN_CELL, gap, false),
  };
}

export function heatmapWidth(m: HeatmapMetrics): number {
  const grid = m.weeks * (m.cell + m.gap) - m.gap;
  return grid + (m.showWeekdays ? WEEKDAY_W + m.gap : 0);
}

export function heatmapHeight(m: HeatmapMetrics): number {
  const grid = 7 * m.cell + 6 * m.gap;
  return grid + LEGEND_H + (m.showWeekdays ? MONTH_ROW_H + m.gap : 0);
}

export function windowLabel(weeks: number): string {
  if (weeks >= WEEKS_IN_YEAR) return "contributions in the last year";
  const months = Math.round((weeks * 7) / 30.44);
  if (months >= 2) return `contributions in the last ${months} months`;
  return `contributions in the last ${weeks} weeks`;
}

export function localDayKey(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
