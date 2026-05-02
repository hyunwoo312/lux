export const UNIT = 50;
export const CELL = 40;
export const GAP = 10;
export const PAD = 5;
export const MIN_COLS = 4;

export function gridColumns(contentWidth: number): number {
  return Math.max(MIN_COLS, Math.floor(contentWidth / UNIT));
}

export function gridWidth(cols: number): number {
  return cols * UNIT;
}
