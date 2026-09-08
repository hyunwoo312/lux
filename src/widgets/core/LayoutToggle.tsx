import { LayoutGrid, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";

type Layout = "list" | "grid";

type LayoutToggleProps = { value: Layout; onChange: (next: Layout) => void };

export function LayoutToggle({ value, onChange }: LayoutToggleProps) {
  const next: Layout = value === "grid" ? "list" : "grid";
  return (
    <ViewToggleButton
      targetKey={next}
      targetLabel={`${next} view`}
      icon={next === "grid" ? LayoutGrid : List}
      onToggle={() => onChange(next)}
    />
  );
}
