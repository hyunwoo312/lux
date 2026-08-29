import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { collapse, enterTween } from "@/lib/motion";
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";

export type SectionTone = "band" | "league";

const LABEL: Record<SectionTone, string> = {
  band: TYPE.eyebrow,
  league: "text-ink-2 text-caption font-semibold",
};

export function ShowMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        press focus-ring text-ink-3
        hover:bg-foreground/5 hover:text-ink
        mx-2 cursor-pointer rounded-md py-1 text-caption transition-colors
      "
    >
      Show more
    </button>
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
            transition={enterTween(reduced, "fast")}
          >
            <ChevronDown className="text-ink-3 size-3.5" aria-hidden />
          </motion.span>
        </button>
      </h4>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" {...collapse(reduced)} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Count({ value }: { value: number }) {
  return <span className="text-ink-3 text-micro shrink-0 tabular-nums">{value}</span>;
}
