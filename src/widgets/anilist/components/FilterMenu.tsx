import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Filter, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { ROW } from "@/lib/row";
import { enterTween, exitTween, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type FilterOption<T extends string> = { value: T; label: string; icon: LucideIcon };

const TRIGGER_CLASS = `focus-ring text-ink-3
 hover:text-ink hover:bg-foreground/5
 focus-visible:text-ink focus-visible:bg-foreground/5
 data-[state=open]:text-ink data-[state=open]:bg-foreground/5
 grid size-7 shrink-0 place-items-center rounded-sm transition-colors
`;

export function FilterMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  tooltip,
}: {
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  tooltip: string;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const active = options.find((option) => option.value === value) ?? options[0];
  const ActiveIcon = active?.icon ?? Filter;
  const enterTransition = enterTween(reduced, "fast");
  const exitTransition = exitTween(reduced, "fast");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={tooltip}>
        <PopoverTrigger aria-label={ariaLabel} className={TRIGGER_CLASS}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={value}
              className="flex"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, transition: enterTransition }}
              exit={
                reduced
                  ? { opacity: 0, transition: exitTransition }
                  : { opacity: 0, scale: 0.5, rotate: 20, transition: exitTransition }
              }
            >
              <ActiveIcon className="size-3.5" aria-hidden />
            </motion.span>
          </AnimatePresence>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-auto min-w-40">
        <div role="menu" aria-label={ariaLabel} className="flex flex-col">
          {options.map((option, index) => {
            const Icon = option.icon;
            const selected = option.value === value;
            return (
              <motion.button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                initial={reduced ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...enterTransition, delay: index * stagger(reduced, "tight") }}
                className={cn(ROW.option, "text-ink", selected && "font-medium")}
              >
                <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="flex-1">{option.label}</span>
                <Check
                  className={cn(
                    "text-primary size-3 shrink-0 transition-opacity",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
              </motion.button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
