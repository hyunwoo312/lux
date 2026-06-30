import {
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import type { NoteFontSize } from "@/widgets/note/types";
import { useNote, useNoteStore } from "@/widgets/note/useNoteStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const FONT_SIZE_OPTIONS: { value: NoteFontSize; label: string }[] = [
  { value: "sm", label: "S" },
  { value: "base", label: "M" },
  { value: "lg", label: "L" },
];

export function NoteConfig() {
  const id = useWidgetInstanceId();
  const { fontSize } = useNote(id);
  const setFontSize = useNoteStore((s) => s.setFontSize);

  return (
    <WidgetConfigGroup label="Note">
      <WidgetConfigItem
        title="Font size"
        description="Note text size"
        control={
          <ConfigSegmented
            label="Note font size"
            value={fontSize}
            options={FONT_SIZE_OPTIONS}
            onChange={(value) => setFontSize(id, value)}
          />
        }
      />
    </WidgetConfigGroup>
  );
}
