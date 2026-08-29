import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { springCrisp } from "@/lib/motion";
import { RANGE_LABEL, STOCK_RANGES, type StockRange } from "@/widgets/stocks/types";

type RangeChipsProps = {
  value: StockRange;
  onChange: (range: StockRange) => void;
};

export function RangeChips({ value, onChange }: RangeChipsProps) {
  const layoutId = useId();
  const reduced = useReducedMotion();

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        const match = STOCK_RANGES.find((range) => range === next);
        if (match) onChange(match);
      }}
      aria-label="Chart range"
      className="bg-foreground/5 flex w-fit max-w-full flex-wrap gap-0.5 rounded-md p-0.5"
    >
      {STOCK_RANGES.map((range) => (
        <ToggleGroupItem
          key={range}
          value={range}
          variant="segmented"
          className="shrink-0 px-2 text-micro"
        >
          {range === value && (
            <motion.span
              layoutId={layoutId}
              transition={springCrisp(reduced)}
              className="bg-primary absolute inset-0 rounded-sm"
            />
          )}
          <span className="relative z-10">{RANGE_LABEL[range]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
