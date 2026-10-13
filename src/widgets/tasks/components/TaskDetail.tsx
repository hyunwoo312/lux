import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfigRow } from "@/components/config/Config";
import { SubtaskEditor } from "@/widgets/tasks/components/SubtaskEditor";
import type { Task, TaskDraft } from "@/widgets/tasks/types";

export function TaskDetail({
  task,
  day,
  onSave,
  onClose,
  onReturnFocus,
}: {
  task: Task;
  day: string;
  onSave: (draft: TaskDraft) => void;
  onClose: () => void;
  onReturnFocus: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    title: task.title,
    description: task.description ?? "",
    important: task.important ?? false,
    todayKey: task.todayKey ?? null,
    subtasks: task.subtasks ?? [],
  });
  const patch = (change: Partial<TaskDraft>) => setDraft((current) => ({ ...current, ...change }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        width="sm"
        showClose={false}
        dismissOnClickOutside={false}
        layout="flush"
        className="max-h-[calc(100dvh-2rem)]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <div className="shrink-0 px-5 pt-5 pb-3">
          <DialogTitle>Task details</DialogTitle>
          <DialogDescription>Plan the task and break it into small steps.</DialogDescription>
        </div>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.title.trim()) onSave(draft);
          }}
        >
          <div className="scroll-fade flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-4">
            <label className="flex flex-col gap-1.5 text-body font-medium">
              Title
              <Input
                aria-label="Edit task"
                value={draft.title}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && draft.title.trim()) {
                    event.preventDefault();
                    onSave(draft);
                  }
                }}
                onChange={(event) => patch({ title: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-body font-medium">
              Description
              <Textarea
                aria-label="Task description"
                placeholder="Notes for this task…"
                rows={3}
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
              />
            </label>
            <ConfigRow
              title="Do today"
              description="Keep it in your daily focus"
              control={
                <Switch
                  aria-label="Do today"
                  checked={draft.todayKey === day}
                  onCheckedChange={(checked) => patch({ todayKey: checked ? day : null })}
                />
              }
            />
            <ConfigRow
              title="Important"
              description="Bring it forward in Focus order"
              control={
                <Switch
                  aria-label="Important task"
                  checked={draft.important}
                  onCheckedChange={(checked) => patch({ important: checked })}
                />
              }
            />
            <SubtaskEditor
              subtasks={draft.subtasks ?? []}
              onChange={(subtasks) => patch({ subtasks })}
            />
          </div>
          <div className="border-border/50 flex shrink-0 justify-end gap-2 border-t px-5 py-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!draft.title.trim()}>
              Save task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
