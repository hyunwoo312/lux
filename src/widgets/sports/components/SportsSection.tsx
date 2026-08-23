import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";

export type SectionTone = "band" | "league";

const LABEL: Record<SectionTone, string> = {
  band: TYPE.eyebrow,
  league: "text-ink-2 text-caption font-semibold",
};

export function SectionHeading({
  label,
  count,
  className,
}: {
  label: string;
  count?: number;
  className?: string;
}) {
  return (
    <h4 className={cn("flex items-center gap-2 px-2 pt-1", className)}>
      <span className={TYPE.eyebrow}>{label}</span>
      {count !== undefined && <Count value={count} />}
      <span aria-hidden className="bg-foreground/8 h-px flex-1" />
    </h4>
  );
}

export function CollapsibleSection({
  label,
  count,
  tone = "band",
  indent = false,
  open: controlled,
  onToggle,
  children,
}: {
  label: string;
  count?: number;
  tone?: SectionTone;
  indent?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const [uncontrolled, setUncontrolled] = useState(true);
  const open = controlled ?? uncontrolled;

  const toggle = () => {
    const next = !open;
    setUncontrolled(next);
    onToggle?.(next);
  };

  return (
    <section className="flex flex-col gap-0.5">
      <h4 className={cn(indent && "pl-3")}>
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className="
            press focus-ring
            hover:bg-foreground/5
            flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors
          "
        >
          <span className={LABEL[tone]}>{label}</span>
          {count !== undefined && <Count value={count} />}
          <span
            aria-hidden
            className={cn(
              "h-px flex-1",
              tone === "league" ? "bg-foreground/12" : "bg-foreground/8",
            )}
          />
          <motion.span
            className="flex shrink-0"
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT }}
          >
            <ChevronDown className="text-ink-4 size-3.5" aria-hidden />
          </motion.span>
        </button>
      </h4>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Count({ value }: { value: number }) {
  return <span className="text-ink-4 text-micro shrink-0 tabular-nums">{value}</span>;
}
