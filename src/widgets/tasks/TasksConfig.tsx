import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
  WidgetConfigSubItem,
} from "@/widgets/core/WidgetConfig";
import type { CompletedPosition } from "@/widgets/tasks/types";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";

const COMPLETED_OPTIONS: { value: CompletedPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

export function TasksConfig() {
  const autoSort = useTasksStore((s) => s.autoSort);
  const completedPosition = useTasksStore((s) => s.completedPosition);
  const setAutoSort = useTasksStore((s) => s.setAutoSort);
  const setCompletedPosition = useTasksStore((s) => s.setCompletedPosition);

  return (
    <WidgetConfigGroup label="Tasks">
      <WidgetConfigItem
        title="Auto-sort"
        description="Group tasks by completion"
        control={
          <Switch
            checked={autoSort}
            onCheckedChange={(checked) => setAutoSort(checked === true)}
            aria-label="Auto-sort tasks"
          />
        }
      >
        <WidgetConfigSubItem
          title="Completed"
          description="Where finished tasks go"
          disabled={!autoSort}
          control={
            <ConfigSegmented
              label="Completed task position"
              value={completedPosition}
              options={COMPLETED_OPTIONS}
              onChange={setCompletedPosition}
              disabled={!autoSort}
            />
          }
        />
      </WidgetConfigItem>
    </WidgetConfigGroup>
  );
}
