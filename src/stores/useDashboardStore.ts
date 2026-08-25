import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { Layout, LayoutItem } from "react-grid-layout";
import { keepPersisted, mergePersisted, tolerantArray } from "@/lib/persist";
import { createGatedChromeStorage } from "@/lib/storage";
import { DASHBOARD_SEEDED_KEY, getLocal, setLocal } from "@/lib/local-store";
import {
  findFirstOpenPosition,
  findNearestOpenPosition,
  resolveLayoutCollisions,
} from "@/widgets/core/layout-engine";
import { gridColumns } from "@/widgets/core/grid";
import { pruneInstance } from "@/widgets/core/instanceCleanup";
import type { WidgetInstance, WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { WIDGET_TYPES } from "@/widgets/core/types";
import { getWidgetPlugin } from "@/widgets/registry";
import { showToast } from "@/stores/useToastStore";

const DEFAULT_COLUMNS = 12;
const CONTENT_MAX_WIDTH = 2400;
const CONTENT_INSET = 100;

const STARTER_ROWS: WidgetType[][] = [
  ["quickAccess", "weather"],
  ["tasks", "stocks"],
];
const STARTER_TILE_HEIGHT = 8;
const STARTER_MIN_TILE_WIDTH = 6;
const STARTER_MAX_TILE_WIDTH = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function starterColumns(): number {
  const contentWidth = Math.min(CONTENT_MAX_WIDTH, window.innerWidth - CONTENT_INSET);
  return gridColumns(contentWidth);
}

function starterTiles(columns: number): { type: WidgetType; x: number; y: number; w: number }[] {
  const perRow = STARTER_ROWS[0]?.length ?? 1;
  const width = clamp(Math.floor(columns / perRow), STARTER_MIN_TILE_WIDTH, STARTER_MAX_TILE_WIDTH);
  const inset = Math.max(0, Math.floor((columns - width * perRow) / 2));
  return STARTER_ROWS.flatMap((row, rowIndex) =>
    row.map((type, columnIndex) => ({
      type,
      x: inset + columnIndex * width,
      y: rowIndex * STARTER_TILE_HEIGHT,
      w: width,
    })),
  );
}

export type PendingRemoval = { instance: WidgetInstance; layoutItem: LayoutItem };

type DashboardState = {
  widgets: WidgetInstance[];
  layout: Layout;
  columns: number;
  editing: boolean;
  lastAddedId: string | null;
  pendingRemoval: PendingRemoval | null;
  addWidget: (type: WidgetType, position?: { x: number; y: number }) => void;
  removeWidget: (id: string) => void;
  undoRemove: () => void;
  settlePendingRemoval: (id?: string) => void;
  setLayout: (layout: Layout) => void;
  setColumns: (columns: number) => void;
  toggleEditing: () => void;
  clearLastAdded: () => void;
  seedStarterIfFirstRun: () => void;
};

const widgetTypeSchema = z.enum(WIDGET_TYPES);

const layoutItemSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
});

const widgetInstanceSchema = z.object({ id: z.string(), type: widgetTypeSchema });

const pendingRemovalSchema = z
  .object({ instance: widgetInstanceSchema, layoutItem: layoutItemSchema })
  .nullable()
  .catch(null);

const persistedSchema = z.object({
  widgets: tolerantArray(widgetInstanceSchema),
  layout: tolerantArray(layoutItemSchema),
  pendingRemoval: pendingRemovalSchema.optional(),
});

type ReconciledDashboard = {
  widgets: WidgetInstance[];
  layout: Layout;
  pendingRemoval: PendingRemoval | null;
};

function reconcile(parsed: z.infer<typeof persistedSchema>): ReconciledDashboard {
  const { widgets } = parsed;
  const ids = new Set(widgets.map((widget) => widget.id));
  const layout = parsed.layout.filter((item) => ids.has(item.i));
  const placed = new Set(layout.map((item) => item.i));

  for (const widget of widgets) {
    if (placed.has(widget.id)) continue;
    const plugin = getWidgetPlugin(widget.type);
    if (!plugin) continue;
    layout.push(placeLayoutItem(layout, DEFAULT_COLUMNS, widget.id, plugin, undefined));
  }

  return { widgets, layout, pendingRemoval: parsed.pendingRemoval ?? null };
}

export function reconcilePersisted(persisted: unknown): ReconciledDashboard | null {
  const parsed = persistedSchema.safeParse(persisted);
  return parsed.success ? reconcile(parsed.data) : null;
}

function placeLayoutItem(
  layout: Layout,
  columns: number,
  id: string,
  plugin: WidgetPlugin,
  override: { x: number; y: number } | undefined,
): LayoutItem {
  const { w, h, minW, minH, maxW, maxH } = plugin.defaultLayout;
  const base: LayoutItem = {
    i: id,
    x: override?.x ?? 0,
    y: override?.y ?? 0,
    w,
    h,
    minW,
    minH,
    maxW,
    maxH,
  };
  const spot = override
    ? findNearestOpenPosition(base, layout, columns)
    : findFirstOpenPosition(base, layout, columns);
  return { ...base, x: spot.x, y: spot.y };
}

function createInstanceId(type: WidgetType): string {
  return `${type}-${crypto.randomUUID()}`;
}

const gatedStorage = createGatedChromeStorage();

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: [],
      layout: [],
      columns: DEFAULT_COLUMNS,
      editing: false,
      lastAddedId: null,
      pendingRemoval: null,
      addWidget: (type, position) =>
        set((state) => {
          const plugin = getWidgetPlugin(type);
          if (!plugin) return state;
          const id = createInstanceId(type);
          const item = placeLayoutItem(state.layout, state.columns, id, plugin, position);
          return {
            widgets: [...state.widgets, { id, type }],
            layout: [...state.layout, item],
            lastAddedId: id,
          };
        }),
      removeWidget: (id) => {
        const { widgets, layout } = get();
        const instance = widgets.find((entry) => entry.id === id);
        const layoutItem = layout.find((entry) => entry.i === id);
        if (!instance || !layoutItem) return;
        get().settlePendingRemoval();
        set({
          widgets: widgets.filter((entry) => entry.id !== id),
          layout: layout.filter((entry) => entry.i !== id),
          pendingRemoval: { instance, layoutItem },
        });
        const plugin = getWidgetPlugin(instance.type);
        showToast({
          key: instance.id,
          message: `${plugin?.name ?? "Widget"} removed`,
          note: plugin?.removalNote?.(instance.id) ?? undefined,
          action: { kind: "undo", run: () => get().undoRemove() },
          onExpire: () => get().settlePendingRemoval(instance.id),
        });
      },
      undoRemove: () => {
        const pending = get().pendingRemoval;
        if (!pending) return;
        set((state) => {
          const spot = findNearestOpenPosition(pending.layoutItem, state.layout, state.columns);
          return {
            widgets: [...state.widgets, pending.instance],
            layout: [...state.layout, { ...pending.layoutItem, x: spot.x, y: spot.y }],
            pendingRemoval: null,
          };
        });
      },
      settlePendingRemoval: (id) => {
        const pending = get().pendingRemoval;
        if (!pending) return;
        if (id !== undefined && pending.instance.id !== id) return;
        pruneInstance(pending.instance.id);
        set({ pendingRemoval: null });
      },
      setLayout: (layout) => set({ layout }),
      setColumns: (columns) => set({ columns }),
      toggleEditing: () => set((state) => ({ editing: !state.editing })),
      clearLastAdded: () => set({ lastAddedId: null }),
      seedStarterIfFirstRun: () =>
        set((state) => {
          if (state.widgets.length > 0) return state;
          if (getLocal(DASHBOARD_SEEDED_KEY) !== null) return state;
          setLocal(DASHBOARD_SEEDED_KEY, "1");
          const cols = starterColumns();
          const widgets: WidgetInstance[] = [];
          const raw: LayoutItem[] = [];
          for (const tile of starterTiles(cols)) {
            const plugin = getWidgetPlugin(tile.type);
            if (!plugin) continue;
            const id = createInstanceId(tile.type);
            const { minW, minH, maxW, maxH } = plugin.defaultLayout;
            const w = clamp(tile.w, minW, maxW);
            const h = clamp(STARTER_TILE_HEIGHT, minH, maxH);
            widgets.push({ id, type: tile.type });
            raw.push({
              i: id,
              x: clamp(tile.x, 0, Math.max(0, cols - w)),
              y: tile.y,
              w,
              h,
              minW,
              minH,
              maxW,
              maxH,
            });
          }
          return { widgets, columns: cols, layout: resolveLayoutCollisions(raw, cols, null) };
        }),
    }),
    {
      name: "dashboard",
      storage: gatedStorage,
      version: 1,
      migrate: keepPersisted,
      onRehydrateStorage: () => (state) => {
        if (gatedStorage.open(useDashboardStore) !== "boot") return;
        state?.settlePendingRemoval();
        state?.seedStarterIfFirstRun();
      },
      partialize: (state) => ({
        widgets: state.widgets,
        layout: state.layout,
        pendingRemoval: state.pendingRemoval,
      }),
      merge: (persisted, current) =>
        mergePersisted("dashboard", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          ...reconcile(parsed),
        })),
    },
  ),
);
