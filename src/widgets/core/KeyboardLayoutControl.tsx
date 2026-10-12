import { useId, useRef, useState } from "react";
import { Move } from "lucide-react";
import type { LayoutItem } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { keyboardLayoutItem } from "@/widgets/core/keyboard-layout";

export function KeyboardLayoutControl({
  title,
  item,
  columns,
  onChange,
}: {
  title: string;
  item: LayoutItem;
  columns: number;
  onChange: (item: LayoutItem) => void;
}) {
  const [active, setActive] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const descriptionId = useId();
  const button = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={button}
        variant="ghost"
        size="icon-xs"
        className={WIDGET_HEADER_ACTION}
        aria-label={`Move or resize ${title}`}
        aria-pressed={active}
        aria-describedby={active ? descriptionId : undefined}
        onClick={() => setActive((value) => !value)}
        onBlur={() => setActive(false)}
        onKeyDown={(event) => {
          if (!active) return;
          if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setActive(false);
            setAnnouncement(`${title} layout controls closed.`);
            return;
          }
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const next = keyboardLayoutItem(item, event.key, event.shiftKey, columns);
          if (!next) return;
          event.preventDefault();
          event.stopPropagation();
          onChange(next);
          setAnnouncement(
            `${title}: column ${next.x + 1}, row ${next.y + 1}, ${next.w} wide by ${next.h} high.`,
          );
          requestAnimationFrame(() =>
            button.current?.scrollIntoView({ block: "nearest", inline: "nearest" }),
          );
        }}
      >
        <Move />
      </Button>
      {active && (
        <div
          id={descriptionId}
          className="
            glass-solid text-ink pointer-events-none absolute inset-x-3 top-12 z-widget-chrome
            rounded-lg px-3 py-2 text-caption shadow-elev-2
          "
        >
          Arrow keys move · Shift + arrows resize · Esc finishes
        </div>
      )}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
