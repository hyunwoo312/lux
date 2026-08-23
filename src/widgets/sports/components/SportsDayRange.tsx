import { ConfigSelect } from "@/components/config/WidgetConfig";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { DAY_WINDOWS, DAY_WINDOW_LABEL } from "@/widgets/sports/lib/window";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const WINDOW_OPTIONS = DAY_WINDOWS.map((value) => ({ value, label: DAY_WINDOW_LABEL[value] }));

export function SportsDayRange() {
  const instanceId = useWidgetInstanceId();
  const dayWindow = useSports((d) => d.window);
  const setWindow = useSportsStore((s) => s.setWindow);

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
