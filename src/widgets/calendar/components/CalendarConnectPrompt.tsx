import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConnectOption = {
  label: string;
  busy: boolean;
  onConnect: () => void;
};

type CalendarConnectPromptProps = {
  loaded: boolean;
  error: string | null;
  options: ConnectOption[];
};

export function CalendarConnectPrompt({ loaded, error, options }: CalendarConnectPromptProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <CalendarPlus className="text-primary size-6" aria-hidden />
      <p className="text-muted-foreground text-sm">Connect a calendar to see your schedule.</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {options.map((option) => (
          <Button
            key={option.label}
            size="sm"
            onClick={option.onConnect}
            disabled={option.busy || !loaded}
          >
            {option.busy ? "Connecting…" : `Connect ${option.label}`}
          </Button>
        ))}
      </div>
      {error && <p className="text-destructive text-2xs">{error}</p>}
    </div>
  );
}
