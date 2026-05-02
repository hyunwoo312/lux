import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BaseWidgetProps = {
  title: string;
  editing: boolean;
  size?: { w: number; h: number };
  onRemove: () => void;
  children: ReactNode;
};

const pop = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.7 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

const spin = {
  initial: { opacity: 0, scale: 0.5, rotate: -90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.5, rotate: 90 },
  transition: { duration: 0.2, ease: "easeOut" },
} as const;

export function BaseWidget({ title, editing, size, onRemove, children }: BaseWidgetProps) {
  return (
    <Card
      className={cn(
        "h-full gap-0 overflow-hidden p-0",
        editing &&
          `pointer-events-none select-none`,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
          {title}
        </span>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {editing && size && (
              <motion.span
                key="size"
                {...pop}
                className="
                  bg-foreground/10 text-foreground/80 rounded-md px-1.5 py-0.5 text-[0.7rem]
                  font-medium tabular-nums
                "
              >
                {size.w}×{size.h}
              </motion.span>
            )}
            <motion.div key="settings" layout transition={{ duration: 0.2, ease: "easeOut" }}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground/60 hover:text-foreground size-7 [&_svg]:size-4"
                aria-label="Widget settings"
              >
                <Settings />
              </Button>
            </motion.div>
            {editing && (
              <motion.div key="delete" {...spin}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 [&_svg]:size-4"
                  aria-label={`Remove ${title}`}
                  onClick={onRemove}
                >
                  <X />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">{children}</div>
    </Card>
  );
}
