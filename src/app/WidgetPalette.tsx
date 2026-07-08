import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isOverGrid, resolveDrop } from "@/widgets/core/drag";
import { getAccentVars } from "@/widgets/core/accent";
import type { WidgetPlugin } from "@/widgets/core/types";
import { useWidgetDragStore } from "@/widgets/core/useWidgetDragStore";
import { useWidgetHighlightStore } from "@/widgets/core/useWidgetHighlightStore";
import { widgetPlugins } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

const DRAG_THRESHOLD = 6;
const CLICK_SUPPRESS_MS = 300;

function commitDrop(plugin: WidgetPlugin, px: number, py: number, ghostW: number, ghostH: number) {
  const drag = useWidgetDragStore.getState();
  const { geometry } = drag;
  if (!geometry || !isOverGrid(px, py, geometry)) {
    drag.cancel();
    return;
  }
  const { layout, addWidget } = useDashboardStore.getState();
  const { spot, rect } = resolveDrop(plugin, layout, px, py, geometry);
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
  const previewType = useWidgetPaletteStore((s) => s.previewType);
  const setPreviewType = useWidgetPaletteStore((s) => s.setPreviewType);
  const widgets = useDashboardStore((s) => s.widgets);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const setHighlighted = useWidgetHighlightStore((s) => s.setHighlighted);
  const reduced = useReducedMotion();
  const lastDragEnd = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;
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

  const handleClick = (plugin: WidgetPlugin) => {
    if (performance.now() - lastDragEnd.current < CLICK_SUPPRESS_MS) return;
    handleAdd(plugin);
  };

  const previewPlugin = (plugin: WidgetPlugin) => {
    if (!openRef.current) return;
    setPreviewType(plugin.type);
    if (activeTypes.has(plugin.type)) setHighlighted(plugin.type);
  };

  const clearPreviewPlugin = () => {
    setPreviewType(null);
    setHighlighted(null);
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
            <PopoverPrimitive.Content
              forceMount
              align="end"
              sideOffset={8}
              className="z-50"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
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
                <div className="px-2 pt-1 pb-1.5">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Widgets
                  </p>
                  <p className="text-muted-foreground/60 text-2xs mt-0.5">
                    Click to add, or drag onto the grid.
                  </p>
                </div>
                <div
                  className="flex flex-col gap-0.5"
                  onMouseLeave={clearPreviewPlugin}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      clearPreviewPlugin();
                    }
                  }}
                >
                  {widgetPlugins.map((plugin) => {
                    const Icon = plugin.icon;
                    const added = activeTypes.has(plugin.type);
                    return (
                      <Tooltip key={plugin.type} content={plugin.description} side="right" solid>
                        <motion.button
                          variants={itemVariants}
                          type="button"
                          style={getAccentVars(plugin.accent ?? "default")}
                          onPointerDown={(event) => handlePointerDown(event, plugin)}
                          onMouseEnter={() => previewPlugin(plugin)}
                          onFocus={() => previewPlugin(plugin)}
                          onClick={() => handleClick(plugin)}
                          className="
                            relative flex cursor-grab touch-none items-center gap-3 rounded-md px-2
                            py-2 text-left text-sm outline-none
                          "
                        >
                          {previewType === plugin.type && (
                            <motion.span
                              layoutId="palette-hover"
                              aria-hidden
                              transition={{ type: "spring", stiffness: 520, damping: 42 }}
                              className="
                                border-primary/60 bg-primary/10 pointer-events-none absolute inset-0
                                rounded-md border
                              "
                            />
                          )}
                          <span
                            className={cn(
                              `
                                relative flex size-8 items-center justify-center
                                [&_img]:size-6
                                [&_svg]:size-6
                              `,
                              !plugin.brandIcon && "text-foreground/80",
                            )}
                          >
                            <Icon />
                          </span>
                          <span className="relative flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{plugin.name}</span>
                              {plugin.recommended && !added && (
                                <span
                                  className="
                                    text-primary text-2xs font-semibold tracking-wide uppercase
                                  "
                                >
                                  Recommended
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {plugin.description}
                            </span>
                          </span>
                          {added && (
                            <span
                              className="
                                text-muted-foreground/70 relative flex shrink-0 items-center gap-1
                                text-2xs
                              "
                            >
                              <Check className="size-3" aria-hidden />
                              Added
                            </span>
                          )}
                        </motion.button>
                      </Tooltip>
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
