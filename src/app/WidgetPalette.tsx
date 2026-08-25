import { DURATION, EASE_IN, EASE_OUT, SPRING_CRISP } from "@/lib/motion";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { SearchField } from "@/components/SearchField";
import { cn } from "@/lib/utils";
import { isOverGrid, resolveDrop } from "@/widgets/core/drag";
import { accentClass } from "@/widgets/core/accent";
import { WIDGET_CATEGORIES, WIDGET_CATEGORY_LABELS, type WidgetPlugin } from "@/widgets/core/types";
import { useWidgetDragStore } from "@/widgets/core/useWidgetDragStore";
import { useWidgetHighlightStore } from "@/widgets/core/useWidgetHighlightStore";
import { widgetPlugins } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
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
  added: number;
  needsAccount: boolean;
  previewed: boolean;
  variants: Variants;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPreview: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
};

const WidgetRow = forwardRef<HTMLButtonElement, WidgetCardProps>(function WidgetRow(
  {
    plugin,
    added,
    needsAccount,
    previewed,
    variants,
    onPointerDown,
    onPreview,
    onKeyDown,
    onSelect,
  },
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
        press focus-ring relative flex cursor-grab touch-none items-start gap-2.5 rounded-md px-2
        py-2 text-left
      "
    >
      {previewed && (
        <motion.span
          layoutId="palette-hover"
          aria-hidden
          transition={SPRING_CRISP}
          className="bg-accent pointer-events-none absolute inset-0 rounded-md"
        />
      )}
      <span
        className={cn(
          `
            relative mt-0.5 flex size-7 shrink-0 items-center justify-center
            [&_img]:size-5
            [&_svg]:size-5
          `,
          accentClass(plugin.tint),
          !plugin.brandIcon && "text-primary",
        )}
      >
        <Icon />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body font-medium">{plugin.name}</span>
          {added > 0 && (
            <span
              className="
                bg-foreground/10 text-ink-3 shrink-0 rounded-sm px-1 text-micro font-semibold
                tabular-nums
              "
              aria-hidden
            >
              {added}
            </span>
          )}
          {added > 0 && (
            <span className="sr-only">
              {added === 1 ? "1 on your dashboard" : `${added} on your dashboard`}, adds another
            </span>
          )}
        </span>
        <span className="text-ink-4 text-micro line-clamp-2 leading-snug">
          {plugin.description}
        </span>
        {needsAccount ? (
          <span className="text-ink-4 text-micro font-semibold tracking-wide uppercase">
            Needs an account
          </span>
        ) : (
          plugin.recommended &&
          added === 0 && (
            <span className="text-primary text-micro font-semibold tracking-wide uppercase">
              Recommended
            </span>
          )
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
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[][]>([]);
  const openRef = useRef(open);
  openRef.current = open;
  const activeTypes = new Set(widgets.map((widget) => widget.type));
  const connected = useIntegrationStore((s) =>
    s.accounts
      .filter((account) => account.status === "connected")
      .map((account) => account.providerId)
      .join(","),
  );
  const countOf = (type: string) => widgets.filter((widget) => widget.type === type).length;
  const missingAccount = (plugin: WidgetPlugin) =>
    plugin.requiresAccount !== undefined &&
    !plugin.requiresAccount.some((provider) => connected.split(",").includes(provider));

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setHighlighted(null);
      setQuery("");
    }
  };

  const panelVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : -6 },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          duration: DURATION.fast,
          ease: EASE_OUT,
          staggerChildren: 0.012,
        },
      },
      exit: {
        opacity: 0,
        scale: reduced ? 1 : 0.96,
        y: reduced ? 0 : -6,
        transition: { duration: DURATION.instant, ease: EASE_IN },
      },
    }),
    [reduced],
  );
  const itemVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, y: reduced ? 0 : -6 },
      visible: { opacity: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE_OUT } },
    }),
    [reduced],
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (plugin: WidgetPlugin) =>
      needle.length === 0 ||
      plugin.name.toLowerCase().includes(needle) ||
      plugin.description.toLowerCase().includes(needle);
    return WIDGET_CATEGORIES.map((category) => ({
      category,
      plugins: widgetPlugins.filter((plugin) => plugin.category === category && matches(plugin)),
    })).filter((group) => group.plugins.length > 0);
  }, [query]);

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
          <Button variant="ghost" size="icon-lg" aria-label="Add widget">
            <motion.span
              animate={{ rotate: open ? 45 : 0 }}
              transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
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
              className="z-overlay"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="
                  glass-panel text-popover-foreground w-[40rem] origin-top-left rounded-2xl p-1.5
                  outline-none
                "
              >
                <div className="flex flex-col gap-2 px-2 pt-1 pb-2">
                  <div>
                    <p className="text-ink-4 text-micro font-semibold uppercase">Widgets</p>
                    <p className="text-ink-3 mt-1 text-caption">
                      Click to add, or drag onto the grid.
                    </p>
                  </div>
                  <SearchField
                    ref={searchRef}
                    value={query}
                    onChange={setQuery}
                    label="Search widgets"
                    size="sm"
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        focusCell(0, 0);
                      }
                    }}
                  />
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
                  {groups.length === 0 && (
                    <p className="text-ink-3 col-span-3 px-2 py-6 text-center text-caption">
                      {`No widget matches “${query.trim()}”`}
                    </p>
                  )}
                  {groups.map((group, column) => (
                    <section key={group.category} className="flex min-w-0 flex-col gap-1">
                      <h3 className="text-ink-2 px-2 pb-0.5 text-caption font-semibold">
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
                          added={countOf(plugin.type)}
                          needsAccount={missingAccount(plugin)}
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
