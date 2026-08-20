import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { forwardRef, useMemo, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isOverGrid, resolveDrop } from "@/widgets/core/drag";
import { getAccentVars } from "@/widgets/core/accent";
import { WIDGET_CATEGORIES, WIDGET_CATEGORY_LABELS, type WidgetPlugin } from "@/widgets/core/types";
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

type WidgetCardProps = {
  plugin: WidgetPlugin;
  added: boolean;
  previewed: boolean;
  variants: Variants;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPreview: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
};

const WidgetRow = forwardRef<HTMLButtonElement, WidgetCardProps>(function WidgetRow(
  { plugin, added, previewed, variants, onPointerDown, onPreview, onKeyDown, onSelect },
  ref,
) {
  const Icon = plugin.icon;
  return (
    <motion.button
      ref={ref}
      variants={variants}
      type="button"
      onPointerDown={onPointerDown}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      onKeyDown={onKeyDown}
      onClick={onSelect}
      className="
        relative flex cursor-grab touch-none items-start gap-2.5 rounded-md px-2 py-2 text-left
        outline-none
        focus-visible:ring-primary/60 focus-visible:ring-2
      "
    >
      {previewed && (
        <motion.span
          layoutId="palette-hover"
          aria-hidden
          style={getAccentVars(plugin.accent ?? "default")}
          transition={{ type: "spring", stiffness: 520, damping: 42 }}
          className="
            border-primary/60 bg-primary/10 pointer-events-none absolute inset-0 rounded-md border
          "
        />
      )}
      <span
        className={cn(
          `
            relative mt-0.5 flex size-7 shrink-0 items-center justify-center
            [&_img]:size-5
            [&_svg]:size-5
          `,
          !plugin.brandIcon && "text-foreground/80",
        )}
      >
        <Icon />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{plugin.name}</span>
          {added && <Check className="text-muted-foreground/70 size-3 shrink-0" aria-hidden />}
          {added && <span className="sr-only">Added</span>}
        </span>
        <span className="text-muted-foreground/70 text-2xs line-clamp-2 leading-snug">
          {plugin.description}
        </span>
        {plugin.recommended && !added && (
          <span className="text-primary text-2xs font-semibold tracking-wide uppercase">
            Recommended
          </span>
        )}
      </span>
    </motion.button>
  );
});

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
  const cardRefs = useRef<(HTMLButtonElement | null)[][]>([]);
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
      hidden: { opacity: 0, y: reduced ? 0 : -6 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.14, ease: "easeOut" } },
    }),
    [reduced],
  );

  const groups = useMemo(
    () =>
      WIDGET_CATEGORIES.map((category) => ({
        category,
        plugins: widgetPlugins.filter((plugin) => plugin.category === category),
      })).filter((group) => group.plugins.length > 0),
    [],
  );

  const focusCell = (column: number, row: number) => {
    const columnRefs = cardRefs.current[column];
    if (!columnRefs || columnRefs.length === 0) return;
    columnRefs[Math.max(0, Math.min(columnRefs.length - 1, row))]?.focus();
  };

  const handleGridKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    column: number,
    row: number,
  ) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(column, row + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = column + (event.key === "ArrowRight" ? 1 : -1);
      focusCell(Math.max(0, Math.min(groups.length - 1, next)), row);
    }
  };

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
              align="start"
              sideOffset={8}
              collisionPadding={12}
              className="z-50"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="
                  glass-panel text-popover-foreground w-[40rem] origin-top-left rounded-xl
                  bg-[var(--glass-bg-thick)] p-1.5 outline-none
                "
              >
                <div className="px-2 pt-1 pb-2">
                  <p className="text-muted-foreground/60 text-2xs font-semibold uppercase">
                    Widgets
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Click to add, or drag onto the grid.
                  </p>
                </div>
                <div
                  onMouseLeave={clearPreviewPlugin}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      clearPreviewPlugin();
                    }
                  }}
                  className="grid grid-cols-3 items-start gap-x-2 gap-y-3 px-1 pt-1 pb-1"
                >
                  {groups.map((group, column) => (
                    <section key={group.category} className="flex min-w-0 flex-col gap-1">
                      <h3 className="text-foreground/70 px-2 pb-0.5 text-xs font-semibold">
                        {WIDGET_CATEGORY_LABELS[group.category]}
                      </h3>
                      {group.plugins.map((plugin, row) => (
                        <WidgetRow
                          key={plugin.type}
                          ref={(node) => {
                            cardRefs.current[column] ??= [];
                            cardRefs.current[column][row] = node;
                          }}
                          plugin={plugin}
                          added={activeTypes.has(plugin.type)}
                          previewed={previewType === plugin.type}
                          variants={itemVariants}
                          onPointerDown={(event) => handlePointerDown(event, plugin)}
                          onPreview={() => previewPlugin(plugin)}
                          onKeyDown={(event) => handleGridKeyDown(event, column, row)}
                          onSelect={() => handleClick(plugin)}
                        />
                      ))}
                    </section>
                  ))}
                </div>
              </motion.div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        )}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  );
}
