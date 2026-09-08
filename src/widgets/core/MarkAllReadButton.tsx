import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";

export function MarkAllReadButton({ marking, onClick }: { marking: boolean; onClick: () => void }) {
  return (
    <Tooltip content="Mark all read" prose>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onClick}
        disabled={marking}
        aria-label="Mark all notifications read"
        className="text-ink-3 hover:text-ink"
      >
        {marking ? <Spinner /> : <CheckCheck aria-hidden />}
      </Button>
    </Tooltip>
  );
}
