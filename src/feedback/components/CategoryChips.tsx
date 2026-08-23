import { Bug, Lightbulb, MessageSquareText } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/feedback/types";

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: "Bug Report",
  idea: "Feature Request",
  other: "Other",
};

const CATEGORY_ICON: Record<FeedbackCategory, typeof Bug> = {
  bug: Bug,
  idea: Lightbulb,
  other: MessageSquareText,
};

type Props = {
  value: FeedbackCategory;
  onValueChange: (category: FeedbackCategory) => void;
  labelId: string;
};

export function CategoryChips({ value, onValueChange, labelId }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as FeedbackCategory);
      }}
      aria-labelledby={labelId}
      className="flex flex-wrap gap-2"
    >
      {FEEDBACK_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICON[category];
        const active = value === category;
        return (
          <ToggleGroupItem
            key={category}
            value={category}
            variant="chip"
            className={cn(
              "px-3.5 py-2 text-body",
              active
                ? "border-primary/40 bg-primary/10 text-ink"
                : "border-border text-ink-3 hover:bg-accent/60 hover:text-ink",
            )}
          >
            <Icon aria-hidden className={cn(active && "text-primary")} />
            {CATEGORY_LABEL[category]}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
