import { ConfigSegmented } from "@/components/config/Config";
import { RANGE_LABEL, STOCK_RANGES, type StockRange } from "@/widgets/stocks/types";

type RangeChipsProps = {
  value: StockRange;
  onChange: (range: StockRange) => void;
};

const OPTIONS = STOCK_RANGES.map((range) => ({ value: range, label: RANGE_LABEL[range] }));

export function RangeChips({ value, onChange }: RangeChipsProps) {
  return (
    <ConfigSegmented label="Chart range" value={value} options={OPTIONS} onChange={onChange} />
  );
}
