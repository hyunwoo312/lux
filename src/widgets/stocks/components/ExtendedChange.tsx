import { cn } from "@/lib/utils";
import { formatSigned } from "@/widgets/stocks/lib/format";
import { changeTone, directionOf, type ExtendedSession } from "@/widgets/stocks/lib/quote";

export function ExtendedChange({
  extended,
  className,
}: {
  extended: ExtendedSession;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-micro leading-tight tabular-nums",
        changeTone(directionOf(extended.change)),
        className,
      )}
    >
      <span className="text-ink-3">{extended.kind === "pre" ? "Pre" : "AH"} </span>
      {formatSigned(extended.percent)}%
    </span>
  );
}
