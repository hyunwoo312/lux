import { StickyNote } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { NoteConfig } from "@/widgets/note/NoteConfig";
import { NoteWidget } from "@/widgets/note/NoteWidget";
import { NoteHeaderActions } from "@/widgets/note/components/NoteHeaderActions";
import { NoteStatus } from "@/widgets/note/components/NoteStatus";
import { useNoteStore } from "@/widgets/note/useNoteStore";
import { NOTE_TINT } from "@/widgets/note/types";

export const notePlugin: WidgetPlugin = {
  type: "note",
  name: "Note",
  category: "productivity",
  description: "A quick scratchpad for jotting things down",
  recommended: true,
  icon: StickyNote,
  component: NoteWidget,
  clearInstance: (instanceId) => useNoteStore.getState().removeInstance(instanceId),
  configComponent: NoteConfig,
  statusComponent: NoteStatus,
  headerActionComponent: NoteHeaderActions,
  tint: NOTE_TINT,
  removalNote: (instanceId) =>
    useNoteStore.getState().byInstance[instanceId]?.text.trim()
      ? "Your note's text will be deleted."
      : null,
};
