import { enterTween, exitTween, stagger } from "@/lib/motion";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { SearchField } from "@/components/SearchField";
import { WidgetRow } from "@/app/WidgetRow";
import { useDragWidgetToGrid } from "@/app/useDragWidgetToGrid";
import {
  WIDGET_CATEGORIES,
  WIDGET_CATEGORY_LABELS,
  type WidgetPlugin,
  type WidgetType,
} from "@/widgets/core/types";
import { useWidgetHighlightStore } from "@/widgets/core/useWidgetHighlightStore";
import { widgetPlugins } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

export function WidgetPalette() {
  const open = useWidgetPaletteStore((s) => s.open);
  const setOpen = useWidgetPaletteStore((s) => s.setOpen);
  const previewType = useWidgetPaletteStore((s) => s.previewType);
  const setPreviewType = useWidgetPaletteStore((s) => s.setPreviewType);
  const widgets = useDashboardStore((s) => s.widgets);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const setHighlighted = useWidgetHighlightStore((s) => s.setHighlighted);
  const reduced = useReducedMotion();
  const { onPointerDown, suppressClick } = useDragWidgetToGrid();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef(new Map<WidgetType, HTMLButtonElement | null>());
  const activeTypes = new Set(widgets.map((widget) => widget.type));
  const connected = useIntegrationStore((s) =>
    s.accounts
      .filter((account) => account.status === "connected")
      .map((account) => account.providerId)
      .join(","),
  );
  const connectedProviders = connected.split(",");
  const countOf = (type: string) => widgets.filter((widget) => widget.type === type).length;
  const missingAccount = (plugin: WidgetPlugin) =>
    plugin.requiresAccount !== undefined &&
    !plugin.requiresAccount.some((provider) => connectedProviders.includes(provider));

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
      return;
    }
    setHighlighted(null);
    setQuery("");
  }, [open, setHighlighted]);

  const paletteVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : -6 },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { ...enterTween(reduced, "fast"), staggerChildren: stagger(reduced, "micro") },
      },
      exit: {
        opacity: 0,
        scale: reduced ? 1 : 0.96,
        y: reduced ? 0 : -6,
        transition: exitTween(reduced, "fast"),
      },
    }),
    [reduced],
  );
  const itemVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0, y: reduced ? 0 : -6 },
      visible: { opacity: 1, y: 0, transition: enterTween(reduced, "fast") },
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
    const plugins = groups[column]?.plugins;
    if (!plugins || plugins.length === 0) return;
    const plugin = plugins[Math.max(0, Math.min(plugins.length - 1, row))];
    if (plugin) cardRefs.current.get(plugin.type)?.focus();
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

  const handleClick = (plugin: WidgetPlugin) => {
    if (suppressClick()) return;
    addWidget(plugin.type);
    setHighlighted(null);
    setOpen(false);
  };

  const previewPlugin = (plugin: WidgetPlugin) => {
    if (!useWidgetPaletteStore.getState().open) return;
    setPreviewType(plugin.type);
    if (activeTypes.has(plugin.type)) setHighlighted(plugin.type);
  };

  const clearPreviewPlugin = () => {
    setPreviewType(null);
    setHighlighted(null);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tooltip content="Add widget" disabled={open}>
        <PopoverPrimitive.Trigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label="Add widget">
            <motion.span
              animate={{ rotate: open ? 45 : 0 }}
              transition={enterTween(reduced)}
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
                variants={paletteVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="
                  glass-panel text-popover-foreground w-[min(40rem,calc(100vw-2rem))]
                  origin-top-left rounded-2xl p-1.5 outline-none
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
                            cardRefs.current.set(plugin.type, node);
                          }}
                          plugin={plugin}
                          added={countOf(plugin.type)}
                          needsAccount={missingAccount(plugin)}
                          previewed={previewType === plugin.type}
                          variants={itemVariants}
                          onPointerDown={(event) => onPointerDown(event, plugin)}
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
