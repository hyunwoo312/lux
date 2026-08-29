import { Button } from "@/components/ui/button";
import type { WidgetIcon } from "@/widgets/core/types";

type ConnectOverlayProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  icon?: WidgetIcon;
};

export function ConnectOverlay({
  message,
  actionLabel,
  onAction,
  icon: Icon,
}: ConnectOverlayProps) {
  return (
    <div className="bg-background/55 absolute inset-0 z-widget-overlay grid place-items-center p-4">
      <div
        className="
          bg-card border-border elev-2 flex max-w-[20rem] flex-col items-center gap-3 rounded-xl
          border px-5 py-4 text-center
        "
      >
        {Icon && (
          <span
            aria-hidden
            className="
              bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg
            "
          >
            <Icon className="size-5" />
          </span>
        )}
        <p className="text-ink text-body font-medium text-balance">{message}</p>
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
}
