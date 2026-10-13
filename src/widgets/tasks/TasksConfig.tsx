import { Switch } from "@/components/ui/switch";
import {
  ConfigSelect,
  ConfigSegmented,
  ConfigSection,
  ConfigRow,
  ConfigSubRow,
} from "@/components/config/Config";
import { ArrowDownWideNarrow } from "lucide-react";
import type { CompletedPosition } from "@/widgets/tasks/types";
import { useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const COMPLETED_OPTIONS: { value: CompletedPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

export function TasksConfig() {
  const instanceId = useWidgetInstanceId();
  const order = useTasks((d) => d.order ?? (d.autoSort ? "completion" : "focus"));
  const completedPosition = useTasks((d) => d.completedPosition);
  const removeOnCompletion = useTasks((d) => d.removeOnCompletion);
  const showCompleted = useTasks((d) => d.showCompleted ?? true);
  const setOrder = useTasksStore((s) => s.setOrder);
  const setShowCompleted = useTasksStore((s) => s.setShowCompleted);
  const setCompletedPosition = useTasksStore((s) => s.setCompletedPosition);
  const setRemoveOnCompletion = useTasksStore((s) => s.setRemoveOnCompletion);
  return (
    <ConfigSection title="Tasks">
      <ConfigRow
        title="Order"
        description="Focus brings active, important tasks first. Manual allows dragging in All."
        control={
          <ConfigSelect
            label="Default task order"
            icon={ArrowDownWideNarrow}
            value={order}
            options={[
              { value: "focus", label: "Focus" },
              { value: "manual", label: "Manual" },
              { value: "completion", label: "Completion" },
            ]}
            onChange={(value) => setOrder(instanceId, value)}
          />
        }
      >
        <ConfigSubRow
          title="Completed"
          description="Position in Completion order"
          disabled={order !== "completion"}
          control={
            <ConfigSegmented
              label="Completed task position"
              value={completedPosition}
              options={COMPLETED_OPTIONS}
              onChange={(value) => setCompletedPosition(instanceId, value)}
              disabled={order !== "completion"}
            />
          }
        />
      </ConfigRow>
      <ConfigRow
        title="Show completed"
        description="Include finished tasks in All and Today"
        control={
          <Switch
            checked={showCompleted}
            onCheckedChange={(checked) => setShowCompleted(instanceId, checked)}
            aria-label="Show completed tasks"
          />
        }
      />
      <ConfigRow
        title="Remove on completion"
        description="Remove after checking, with Undo"
        control={
          <Switch
            checked={removeOnCompletion}
            onCheckedChange={(checked) => setRemoveOnCompletion(instanceId, checked)}
            aria-label="Remove tasks on completion"
          />
        }
      />
    </ConfigSection>
  );
}
