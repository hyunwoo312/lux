import { ConfigSelect } from "@/components/config/Config";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { DAY_WINDOWS, DAY_WINDOW_LABEL } from "@/widgets/sports/lib/window";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const WINDOW_OPTIONS = DAY_WINDOWS.map((value) => ({ value, label: DAY_WINDOW_LABEL[value] }));

export function SportsDayRange({ compact = false }: { compact?: boolean }) {
  const instanceId = useWidgetInstanceId();
  const dayWindow = useSports((d) => d.window);
  const setWindow = useSportsStore((s) => s.setWindow);

  if (compact)
    return (
      <Select
        value={dayWindow}
        onValueChange={(next) => {
          if (DAY_WINDOWS.includes(next as typeof dayWindow))
            setWindow(instanceId, next as typeof dayWindow);
        }}
      >
        <SelectTrigger
          aria-label="Days shown"
          className="
            hover:bg-foreground/5
            h-7 w-auto shrink-0 border-0 bg-transparent px-1.5 shadow-none
            [&>svg]:hidden
          "
        >
          <SelectValue>
            ±{dayWindow === "today" ? 0 : dayWindow === "day" ? 1 : dayWindow === "week" ? 3 : 7}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-44" align="end">
          {WINDOW_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value === "today" ? "Selected day only" : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

  return (
    <ConfigSelect
      label="Days shown"
      value={dayWindow}
      options={WINDOW_OPTIONS}
      onChange={(next) => setWindow(instanceId, next)}
      triggerClassName="w-auto shrink-0 text-caption"
      contentClassName="w-auto min-w-[var(--radix-select-trigger-width)] whitespace-nowrap"
    />
  );
}
