import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import type { Transition, Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DURATION, EASE_IN, EASE_OUT, POP } from "@/lib/motion";
import { accentClass, type AccentPreset } from "@/widgets/core/accent";
import type { WidgetBackground } from "@/widgets/core/useWidgetSettingsStore";
import { HEADER_LABEL, WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { WidgetChromeContext } from "@/widgets/core/useWidgetChrome";
import { FauxGlassBackdrop } from "@/widgets/core/FauxGlassBackdrop";
import { useWallpaperStore } from "@/stores/useWallpaperStore";

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
  decorativeBackdrop?: boolean;
  headline?: ReactNode;
  headerAction?: ReactNode;
  config?: ReactNode;
  onRemove: () => void;
  children: ReactNode;
};

const spin = {
  initial: { opacity: 0, scale: 0.5, rotate: -90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.5, rotate: 90 },
  transition: { duration: DURATION.base, ease: EASE_OUT },
} as const;

const swapTransition: Transition = { duration: DURATION.fast, ease: EASE_OUT };
const paneEnter: Transition = { duration: DURATION.base, ease: EASE_OUT };
const paneExit: Transition = { duration: DURATION.fast, ease: EASE_IN };
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
  decorativeBackdrop = false,
  headline,
  headerAction,
  config,
  onRemove,
  children,
}: BaseWidgetProps) {
  const reduced = useReducedMotion();
  const livePattern = useWallpaperStore((s) => s.source === "generated");
  const [configOpen, setConfigOpen] = useState(false);
  const chrome = useMemo(() => ({ openConfig: () => setConfigOpen(true) }), []);
  const showConfig = configOpen && !editing;

  const hasBackdrop = Boolean(backdrop);
  const contentBackdrop = hasBackdrop && !decorativeBackdrop;
  const chromeHidden = bare && !editing && !showConfig;
  const omitSurface = chromeHidden || (contentBackdrop && showConfig);

  const viewVariants = useMemo<Variants>(() => {
    const offset = reduced ? 0 : 12;
    return {
      initial: (toConfig: boolean) => ({ opacity: 0, x: toConfig ? offset : -offset }),
      animate: { opacity: 1, x: 0, transition: paneEnter },
      exit: (toConfig: boolean) => ({
        opacity: 0,
        x: toConfig ? -offset : offset,
        transition: paneExit,
      }),
    };
  }, [reduced]);

  const iconSpin = useCallback(
    (sign: number) => ({
      initial: { opacity: 0, scale: 0.6, rotate: reduced ? 0 : sign * 90 },
      animate: { opacity: 1, scale: 1, rotate: 0 },
      exit: { opacity: 0, scale: 0.6, rotate: reduced ? 0 : sign * -90 },
      transition: swapTransition,
    }),
    [reduced],
  );

  return (
    <WidgetChromeContext.Provider value={chrome}>
      <div
        onKeyDown={(event) => {
          if (event.key === "Escape" && showConfig) {
            event.stopPropagation();
            setConfigOpen(false);
          }
        }}
        className={cn(
          accentClass(accent),
          `
            text-card-foreground group/widget relative flex h-full flex-col overflow-hidden
            rounded-2xl transition-shadow
          `,
          !omitSurface &&
            (background === "solid" ? "glass-solid" : livePattern ? "glass" : "glass-faux"),
          !omitSurface &&
            !highlighted &&
            `hover:ring-primary/45 hover:ring-2 focus-within:ring-primary/70 focus-within:ring-2`,
          highlighted && "ring-primary/70 shadow-glow-accent ring-2",
          editing && `pointer-events-none select-none`,
        )}
      >
        {!omitSurface && background !== "solid" && !livePattern && <FauxGlassBackdrop />}
        {!omitSurface && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-0",
              highlighted ? "widget-bloom" : "widget-sheen",
            )}
          />
        )}
        {backdrop && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-0",
              showConfig && "scale-105 opacity-80 blur-sm",
            )}
          >
            {backdrop}
          </div>
        )}
        {contentBackdrop && showConfig && (
          <div
            className="bg-background/70 pointer-events-none absolute inset-0 z-widget-scrim"
            aria-hidden
          />
        )}
        <div
          className={cn(
            "relative z-widget-chrome flex items-center justify-between gap-2 px-4 py-2",
            chromeHidden &&
              `
                absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent pb-6
                opacity-0 transition-opacity duration-200
                group-hover/widget:opacity-100
                group-focus-within/widget:opacity-100
                [&_button]:text-white/75
                [&_button:hover]:text-white
              `,
          )}
        >
          <div className="@container relative min-w-0 flex-1">
            <AnimatePresence mode="popLayout" initial={false} custom={showConfig}>
              <motion.div
                key={showConfig ? "config" : "main"}
                custom={showConfig}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full min-w-0"
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
                  {...POP}
                  className="
                    bg-foreground text-background rounded-md px-1.5 py-0.5 text-caption
                    font-semibold tabular-nums shadow-md
                  "
                >
                  {size.w} × {size.h}
                </motion.span>
              )}
              {!editing && !showConfig && headerAction && (
                <motion.div key="action" {...POP}>
                  {headerAction}
                </motion.div>
              )}
              {!editing && config && (
                <motion.div key="config-toggle" {...POP}>
                  <Tooltip content={showConfig ? "Done" : "Settings"} sticky>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className={WIDGET_HEADER_ACTION}
                      aria-label={showConfig ? `Close ${title} settings` : `${title} settings`}
                      aria-pressed={showConfig}
                      onClick={() => setConfigOpen((value) => !value)}
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
                  <Tooltip content={`Remove ${title}`}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className={WIDGET_HEADER_ACTION}
                      aria-label={`Remove ${title}`}
                      onClick={onRemove}
                    >
                      <X />
                    </Button>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="@container relative z-widget-content min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={showConfig}>
            <motion.div
              key={showConfig ? "config" : "main"}
              custom={showConfig}
              variants={viewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(
                "h-full w-full overscroll-contain",
                showConfig
                  ? "scroll-fade overflow-x-hidden overflow-y-auto px-4 pb-3"
                  : bleed
                    ? "overflow-hidden"
                    : "scroll-fade overflow-auto px-4 pb-3",
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
