import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  hideLabel?: boolean;
  className?: string;
  onChange: (value: number) => void;
};

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  hideLabel = false,
  className,
  onChange,
}: SliderFieldProps) {
  if (hideLabel) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => next !== undefined && onChange(next)}
          aria-label={label}
        />
        <span className="text-sm font-medium tabular-nums">{display}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium tabular-nums">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => next !== undefined && onChange(next)}
        aria-label={label}
      />
    </div>
  );
}
