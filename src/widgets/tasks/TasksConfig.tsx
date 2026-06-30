import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
  WidgetConfigSubItem,
} from "@/components/config/WidgetConfig";
import type { CompletedPosition } from "@/widgets/tasks/types";
import { useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const COMPLETED_OPTIONS: { value: CompletedPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

export function TasksConfig() {
  const instanceId = useWidgetInstanceId();
  const autoSort = useTasks((d) => d.autoSort);
  const completedPosition = useTasks((d) => d.completedPosition);
  const removeOnCompletion = useTasks((d) => d.removeOnCompletion);
  const setAutoSort = useTasksStore((s) => s.setAutoSort);
  const setCompletedPosition = useTasksStore((s) => s.setCompletedPosition);
  const setRemoveOnCompletion = useTasksStore((s) => s.setRemoveOnCompletion);

  return (
    <WidgetConfigGroup label="Tasks">
      <WidgetConfigItem
        title="Auto-sort"
        description="Group tasks by completion"
        control={
          <Switch
            checked={autoSort}
            onCheckedChange={(checked) => setAutoSort(instanceId, checked === true)}
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
              onChange={(value) => setCompletedPosition(instanceId, value)}
              disabled={!autoSort}
            />
          }
        />
      </WidgetConfigItem>
      <WidgetConfigItem
        title="Remove on completion"
        description="Delete a task shortly after it is checked"
        control={
          <Switch
            checked={removeOnCompletion}
            onCheckedChange={(checked) => setRemoveOnCompletion(instanceId, checked === true)}
            aria-label="Remove tasks on completion"
          />
        }
      />
    </WidgetConfigGroup>
  );
}
