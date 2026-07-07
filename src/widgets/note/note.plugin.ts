import { StickyNote } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { NoteConfig } from "@/widgets/note/NoteConfig";
import { NoteWidget } from "@/widgets/note/NoteWidget";
import { NoteStatus } from "@/widgets/note/components/NoteStatus";
import { useNoteStore } from "@/widgets/note/useNoteStore";

export const notePlugin: WidgetPlugin = {
  type: "note",
  name: "Note",
  icon: StickyNote,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: NoteWidget,
  configComponent: NoteConfig,
  statusComponent: NoteStatus,
  accent: "yellow",
  removalNote: (instanceId) =>
    useNoteStore.getState().byInstance[instanceId]?.text.trim()
      ? "Your note's text will be deleted."
      : null,
};
