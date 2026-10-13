import { ArrowDownWideNarrow } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import type { TasksOrder } from "@/widgets/tasks/types";

const OPTIONS: { value: TasksOrder; label: string }[] = [
  { value: "focus", label: "Focus" },
  { value: "manual", label: "Manual" },
  { value: "completion", label: "Completion" },
];

export function TaskOrderMenu({
  order,
  onOrder,
}: {
  order: TasksOrder;
  onOrder: (value: TasksOrder) => void;
}) {
  return (
    <Select
      value={order}
      onValueChange={(value) => {
        const option = OPTIONS.find((option) => option.value === value);
        if (option) onOrder(option.value);
      }}
    >
      <Tooltip content={`Order · ${OPTIONS.find((option) => option.value === order)?.label}`}>
        <SelectTrigger
          aria-label="Task order"
          className="
            h-8 w-auto gap-1 border-0 bg-transparent px-1 text-ink-3 shadow-none
            hover:bg-transparent hover:text-ink
          "
        >
          <ArrowDownWideNarrow aria-hidden />
        </SelectTrigger>
      </Tooltip>
      <SelectContent className="w-36">
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
