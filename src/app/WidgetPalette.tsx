import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isOverGrid, resolveDrop } from "@/widgets/core/drag";
import type { WidgetPlugin } from "@/widgets/core/types";
import { useWidgetDragStore } from "@/widgets/core/useWidgetDragStore";
import { useWidgetHighlightStore } from "@/widgets/core/useWidgetHighlightStore";
import { widgetPlugins } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useWidgetPaletteStore } from "@/app/useWidgetPaletteStore";

const DRAG_THRESHOLD = 6;
const CLICK_SUPPRESS_MS = 300;

function commitDrop(plugin: WidgetPlugin, px: number, py: number, ghostW: number, ghostH: number) {
  const drag = useWidgetDragStore.getState();
  const { geometry } = drag;
  if (!geometry || !isOverGrid(px, py, geometry)) {
    drag.cancel();
    return;
  }
  const { layout, savedLayouts, addWidget } = useDashboardStore.getState();
  const { spot, rect } = resolveDrop(plugin, savedLayouts[plugin.type], layout, px, py, geometry);
  addWidget(plugin.type, spot);
  drag.drop({
    type: plugin.type,
    from: { x: px - ghostW / 2, y: py - ghostH / 2, w: ghostW, h: ghostH },
    to: rect,
  });
}

export function WidgetPalette() {
  const open = useWidgetPaletteStore((s) => s.open);
  const setOpen = useWidgetPaletteStore((s) => s.setOpen);
  const widgets = useDashboardStore((s) => s.widgets);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const setHighlighted = useWidgetHighlightStore((s) => s.setHighlighted);
  const reduced = useReducedMotion();
  const lastDragEnd = useRef(0);
  const activeTypes = new Set(widgets.map((widget) => widget.type));

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setHighlighted(null);
  };

  const panelVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : -6 },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.16, ease: "easeOut", staggerChildren: 0.03, delayChildren: 0.02 },
      },
      exit: {
        opacity: 0,
        scale: reduced ? 1 : 0.96,
        y: reduced ? 0 : -6,
        transition: { duration: 0.12, ease: "easeIn" },
      },
    }),
    [reduced],
  );
  const itemVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, x: reduced ? 0 : -8 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.14, ease: "easeOut" } },
    }),
    [reduced],
  );

  const handleAdd = (plugin: WidgetPlugin) => {
    addWidget(plugin.type);
    setHighlighted(null);
    setOpen(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, plugin: WidgetPlugin) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = event.currentTarget.getBoundingClientRect();
    const ghostW = rect.width;
    const ghostH = rect.height;
    let started = false;

    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", onCancel);
    };
    const move = (e: PointerEvent) => {
      if (!started) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
        started = true;
        setOpen(false);
        useWidgetDragStore.getState().start(plugin.type, e.clientX, e.clientY, ghostW, ghostH);
      }
      useWidgetDragStore.getState().move(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      cleanup();
      if (!started) return;
      commitDrop(plugin, e.clientX, e.clientY, ghostW, ghostH);
      lastDragEnd.current = performance.now();
    };
    const onCancel = () => {
      cleanup();
      if (!started) return;
      useWidgetDragStore.getState().cancel();
      lastDragEnd.current = performance.now();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", onCancel);
  };

  const handleClick = (plugin: WidgetPlugin, onDashboard: boolean) => {
    if (performance.now() - lastDragEnd.current < CLICK_SUPPRESS_MS) return;
    if (!onDashboard) handleAdd(plugin);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <Tooltip content="Add widget" disabled={open}>
        <PopoverPrimitive.Trigger asChild>
          <Button
            data-tour="add-widget"
            variant="ghost"
            size="icon"
            className="size-10 [&_svg]:size-5"
            aria-label="Add widget"
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
              className="grid place-items-center"
            >
              <Plus />
            </motion.span>
          </Button>
        </PopoverPrimitive.Trigger>
      </Tooltip>
      <AnimatePresence>
        {open && (
          <PopoverPrimitive.Portal forceMount>
            <PopoverPrimitive.Content forceMount align="end" sideOffset={8} className="z-50">
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="
                  glass-panel text-popover-foreground w-60 origin-top-right rounded-xl
                  bg-[var(--glass-bg-thick)] p-1.5 outline-none
                "
              >
                <p
                  className="
                    text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wide uppercase
                  "
                >
                  Widgets
                </p>
                <div className="flex flex-col gap-0.5">
                  {widgetPlugins.map((plugin) => {
                    const onDashboard = activeTypes.has(plugin.type);
                    const Icon = plugin.icon;
                    return (
                      <motion.button
                        key={plugin.type}
                        variants={itemVariants}
                        type="button"
                        aria-disabled={onDashboard}
                        onPointerDown={
                          onDashboard ? undefined : (event) => handlePointerDown(event, plugin)
                        }
                        onMouseEnter={onDashboard ? () => setHighlighted(plugin.type) : undefined}
                        onMouseLeave={onDashboard ? () => setHighlighted(null) : undefined}
                        onClick={() => handleClick(plugin, onDashboard)}
                        className={cn(
                          `
                            flex touch-none items-center gap-3 rounded-md px-2 py-2 text-left
                            text-sm transition-colors outline-none
                          `,
                          onDashboard
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-accent focus-visible:bg-accent cursor-grab",
                        )}
                      >
                        <span
                          className={cn(
                            `flex size-8 items-center justify-center [&_img]:size-6 [&_svg]:size-6`,
                            !plugin.brandIcon && "text-foreground/80",
                          )}
                        >
                          <Icon />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-medium">{plugin.name}</span>
                          {onDashboard && (
                            <span className="text-muted-foreground text-xs">On dashboard</span>
                          )}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  );
}
