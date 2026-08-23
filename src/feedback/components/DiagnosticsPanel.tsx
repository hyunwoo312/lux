import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { describeDiagnostics } from "@/feedback/lib/diagnostics";
import type { Diagnostics } from "@/feedback/types";

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  diagnostics: Diagnostics;
};

export function DiagnosticsPanel({ enabled, onEnabledChange, diagnostics }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const switchId = useId();
  const panelId = useId();

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4",
        enabled ? "border-primary/30 bg-primary/5" : "border-border/50",
      )}
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label htmlFor={switchId} className="text-body font-medium">
            Include diagnostics
          </label>
          <p className="text-ink-4 text-caption">
            Your Lux version, browser, and which widgets and accounts you use — never their
            contents.
          </p>
        </div>
        <Switch id={switchId} checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      <Button
        size="xs"
        variant="ghost"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="text-ink-3 hover:text-ink -ml-2"
      >
        {open ? "Hide" : "View"} what would be sent
        <motion.span
          className="flex"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT }}
        >
          <ChevronDown aria-hidden />
        </motion.span>
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className="w-full overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
          >
            <dl className="bg-background/50 flex flex-col gap-1 rounded-md p-2.5">
              {describeDiagnostics(diagnostics).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-4 shrink-0 text-micro">{label}</dt>
                  <dd className="text-ink-3 min-w-0 text-right text-micro">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
