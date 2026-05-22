import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Transition, Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ACCENT_PRESETS, type AccentPreset } from "@/widgets/core/accent";
import type { WidgetBackground } from "@/widgets/core/useWidgetSettingsStore";
import { WidgetChromeContext } from "@/widgets/core/useWidgetChrome";

type BaseWidgetProps = {
  title: string;
  editing: boolean;
  size?: { w: number; h: number };
  background?: WidgetBackground;
  accent?: AccentPreset;
  bleed?: boolean;
  bare?: boolean;
  highlighted?: boolean;
  backdrop?: ReactNode;
  headline?: ReactNode;
  headerAction?: ReactNode;
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
const HEADER_LABEL =
  "text-muted-foreground block truncate text-xs font-medium tracking-wide uppercase";

export function BaseWidget({
  title,
  editing,
  size,
  background = "glass",
  accent = "default",
  bleed = false,
  bare = false,
  highlighted = false,
  backdrop,
  headline,
  headerAction,
  config,
  onRemove,
  children,
}: BaseWidgetProps) {
  const reduced = useReducedMotion();
  const [showConfig, setShowConfig] = useState(false);
  const chrome = useMemo(() => ({ openConfig: () => setShowConfig(true) }), []);

  useEffect(() => {
    if (editing) setShowConfig(false);
  }, [editing]);

  const hasBackdrop = Boolean(backdrop);
  const chromeHidden = bare && !editing && !showConfig;
  const omitSurface = chromeHidden || (hasBackdrop && showConfig);

  const preset = ACCENT_PRESETS[accent];
  const accentStyle = {
    "--primary": preset.primary,
    "--primary-foreground": preset.primaryForeground,
    "--ring": preset.primary,
    "--widget-gradient": preset.gradient ?? preset.primary,
    "--widget-gradient-strength": preset.gradientStrength ?? "20%",
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
    <WidgetChromeContext.Provider value={chrome}>
    <div
      style={accentStyle}
      className={cn(
        `
          text-card-foreground relative flex h-full flex-col overflow-hidden rounded-xl
          transition-shadow
        `,
        !omitSurface && (background === "solid" ? "glass-solid" : "glass"),
        highlighted && "ring-primary/70 shadow-[0_0_22px_-2px_var(--primary)] ring-2",
        editing && `pointer-events-none select-none`,
      )}
    >
      {backdrop && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-0",
            showConfig && "scale-[1.02] opacity-80 blur-sm",
          )}
        >
          {backdrop}
        </div>
      )}
      {hasBackdrop && showConfig && (
        <div className="bg-background/70 pointer-events-none absolute inset-0 z-[5]" aria-hidden />
      )}
      <div className="relative z-10 flex items-center justify-between gap-2 px-4 py-2">
        <div className="@container relative min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false} custom={showConfig}>
            <motion.div
              key={showConfig ? "config" : "main"}
              custom={showConfig}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={swapTransition}
              className="min-w-0"
            >
              {showConfig ? (
                <span className={HEADER_LABEL}>Settings</span>
              ) : (
                (headline ?? <span className={HEADER_LABEL}>{title}</span>)
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {editing && size && (
              <motion.span
                key="size"
                {...pop}
                className="
                  bg-foreground text-background rounded-md px-1.5 py-0.5 text-xs font-semibold
                  tabular-nums shadow-md
                "
              >
                {size.w} × {size.h}
              </motion.span>
            )}
            {!editing && !showConfig && headerAction && (
              <motion.div key="action" {...pop}>
                {headerAction}
              </motion.div>
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
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={showConfig}>
          <motion.div
            key={showConfig ? "config" : "main"}
            custom={showConfig}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={swapTransition}
            className={cn(
              "h-full",
              showConfig
                ? "overflow-x-hidden overflow-y-auto px-4 pb-3"
                : bleed
                  ? "overflow-hidden"
                  : "overflow-auto px-4 pb-3",
            )}
          >
            {showConfig ? config : children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    </WidgetChromeContext.Provider>
  );
}
