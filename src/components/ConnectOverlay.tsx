import { Button } from "@/components/ui/button";

type ConnectOverlayProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function ConnectOverlay({ message, actionLabel, onAction }: ConnectOverlayProps) {
  return (
    <div
      className="
        bg-background/30 absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 px-4
        text-center
      "
    >
      <p className="text-ink text-body font-medium">{message}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}
