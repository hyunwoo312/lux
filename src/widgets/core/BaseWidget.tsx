import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { Transition, Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ACCENT_PRESETS, type AccentPreset } from "@/widgets/core/accent";
import type { WidgetBackground } from "@/widgets/core/useWidgetSettingsStore";

type BaseWidgetProps = {
  title: string;
  editing: boolean;
  size?: { w: number; h: number };
  background?: WidgetBackground;
  accent?: AccentPreset;
  headline?: ReactNode;
  config?: ReactNode;
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

const swapTransition: Transition = { duration: 0.18, ease: "easeOut" };

export function BaseWidget({
  title,
  editing,
  size,
  background = "glass",
  accent = "default",
  headline,
  config,
  onRemove,
  children,
}: BaseWidgetProps) {
  const reduced = useReducedMotion();
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (editing) setShowConfig(false);
  }, [editing]);

  const preset = ACCENT_PRESETS[accent];
  const accentStyle = {
    "--primary": preset.primary,
    "--primary-foreground": preset.primaryForeground,
    "--ring": preset.primary,
  } as CSSProperties;

  const offset = reduced ? 0 : 12;
  const viewVariants: Variants = {
    initial: (toConfig: boolean) => ({ opacity: 0, x: toConfig ? offset : -offset }),
    animate: { opacity: 1, x: 0 },
    exit: (toConfig: boolean) => ({ opacity: 0, x: toConfig ? -offset : offset }),
  };
  const iconSpin = (sign: number) => ({
    initial: { opacity: 0, scale: 0.6, rotate: reduced ? 0 : sign * 90 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.6, rotate: reduced ? 0 : sign * -90 },
    transition: swapTransition,
  });

  return (
    <Card
      style={accentStyle}
      className={cn(
        "h-full gap-0 overflow-hidden p-0",
        background === "solid" && "glass-solid",
        editing && `pointer-events-none select-none`,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <div className="relative min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false} custom={showConfig}>
            <motion.span
              key={showConfig ? "config" : "main"}
              custom={showConfig}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={swapTransition}
              className="
                text-muted-foreground block truncate text-xs font-medium tracking-wide uppercase
              "
            >
              {showConfig ? "Settings" : (headline ?? title)}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {editing && size && (
              <motion.span
                key="size"
                {...pop}
                className="
                  bg-background/90 text-foreground ring-border rounded-md px-1.5 py-0.5 text-xs
                  font-semibold tabular-nums shadow-sm ring-1
                "
              >
                {size.w} × {size.h}
              </motion.span>
            )}
            {!editing && config && (
              <motion.div key="config-toggle" {...pop}>
                <Tooltip content={showConfig ? "Done" : "Settings"} sticky>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="
                      text-muted-foreground/60
                      hover:text-foreground
                      size-7 rounded-sm
                      [&_svg]:size-4
                    "
                    aria-label={showConfig ? `Close ${title} settings` : `${title} settings`}
                    aria-pressed={showConfig}
                    onClick={() => setShowConfig((value) => !value)}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {showConfig ? (
                        <motion.span key="done" {...iconSpin(-1)}>
                          <Check />
                        </motion.span>
                      ) : (
                        <motion.span key="cog" {...iconSpin(1)}>
                          <Settings />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </Tooltip>
              </motion.div>
            )}
            {editing && (
              <motion.div key="delete" {...spin}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm [&_svg]:size-4"
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
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={showConfig}>
          <motion.div
            key={showConfig ? "config" : "main"}
            custom={showConfig}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={swapTransition}
            className="h-full overflow-auto px-4 pb-3"
          >
            {showConfig ? config : children}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}
