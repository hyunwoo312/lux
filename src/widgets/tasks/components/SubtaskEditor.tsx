import { useState } from "react";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/IconActionButton";
import { newId } from "@/lib/utils";
import type { Subtask } from "@/widgets/tasks/types";

export function SubtaskEditor({
  subtasks,
  onChange,
}: {
  subtasks: Subtask[];
  onChange: (children: Subtask[]) => void;
}) {
  const [title, setTitle] = useState("");
  const move = (index: number, offset: number) => {
    const next = [...subtasks];
    const destination = index + offset;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination]!, next[index]!];
    onChange(next);
  };
  const add = () => {
    if (!title.trim()) return;
    onChange([...subtasks, { id: newId("subtask"), title: title.trim(), done: false }]);
    setTitle("");
  };
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-ink mb-2 text-body font-medium">
        Checklist{" "}
        {subtasks.length > 0
          ? `· ${subtasks.filter((child) => child.done).length}/${subtasks.length}`
          : ""}
      </legend>
      {subtasks.map((child, index) => (
        <div key={child.id} className="flex items-center gap-2">
          <Checkbox
            checked={child.done}
            aria-label={`Complete checklist item ${index + 1}`}
            onCheckedChange={(done) =>
              onChange(
                subtasks.map((entry) =>
                  entry.id === child.id ? { ...entry, done: done === true } : entry,
                ),
              )
            }
          />
          <Input
            value={child.title}
            aria-label={`Checklist item ${index + 1}`}
            onChange={(event) =>
              onChange(
                subtasks.map((entry) =>
                  entry.id === child.id ? { ...entry, title: event.target.value } : entry,
                ),
              )
            }
            className="min-w-0 flex-1"
          />
          <IconActionButton
            size="icon-xs"
            icon={ArrowUp}
            label={`Move checklist item ${index + 1} up`}
            tooltip="Move up"
            disabled={index === 0}
            onClick={() => move(index, -1)}
          />
          <IconActionButton
            size="icon-xs"
            icon={ArrowDown}
            label={`Move checklist item ${index + 1} down`}
            tooltip="Move down"
            disabled={index === subtasks.length - 1}
            onClick={() => move(index, 1)}
          />
          <IconActionButton
            size="icon-xs"
            icon={X}
            label={`Remove checklist item ${index + 1}`}
            tooltip="Remove item"
            onClick={() => onChange(subtasks.filter((entry) => entry.id !== child.id))}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          aria-label="New checklist item"
          placeholder="Add a step…"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Add checklist item"
          disabled={!title.trim()}
          onClick={add}
        >
          <Plus aria-hidden />
        </Button>
      </div>
      <p className="text-ink-3 text-caption">
        All steps complete the task. Checking the task completes all steps.
      </p>
    </fieldset>
  );
}
