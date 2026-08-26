import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";

type ListGroupHeadingProps = {
  label: string;
  gutter?: number;
  className?: string;
};

export function ListGroupHeading({ label, gutter, className }: ListGroupHeadingProps) {
  return (
    <h3
      style={gutter === undefined ? undefined : { paddingLeft: gutter }}
      className={cn("sticky top-0 z-30 flex items-center gap-2 pt-3 pb-1", className)}
    >
      <span className={TYPE.eyebrow}>{label}</span>
      <span aria-hidden className="bg-foreground/8 h-px flex-1" />
    </h3>
  );
}
