export const ROW_IDENTITY_CLASS = "w-[5.5rem]";

const ROW_IDENTITY_WIDTH = 88;
const ROW_PRICE_WIDTH = 84;
const ROW_GAPS = 36;
const MIN_SPARKLINE_WIDTH = 90;

const CARD_MIN_WIDTH = 168;
const MAX_COLUMNS = 3;

export function showsSparkline(width: number): boolean {
  return width - ROW_IDENTITY_WIDTH - ROW_PRICE_WIDTH - ROW_GAPS >= MIN_SPARKLINE_WIDTH;
}

export function gridColumns(width: number): number {
  return Math.max(1, Math.min(MAX_COLUMNS, Math.floor(width / CARD_MIN_WIDTH)));
}

export function tooltipLeft(anchorX: number, tooltipWidth: number, chartWidth: number): number {
  const centred = anchorX - tooltipWidth / 2;
  return Math.min(Math.max(centred, 0), Math.max(0, chartWidth - tooltipWidth));
}
