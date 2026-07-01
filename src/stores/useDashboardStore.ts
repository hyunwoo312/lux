import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { Layout, LayoutItem } from "react-grid-layout";
import { createGatedChromeStorage } from "@/lib/storage";
import { findNearestOpenPosition } from "@/widgets/core/layout-engine";
import { pruneInstance } from "@/widgets/core/instanceCleanup";
import type { WidgetInstance, WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { WIDGET_TYPES } from "@/widgets/core/types";
import { getWidgetPlugin } from "@/widgets/registry";

const DEFAULT_COLUMNS = 12;

type DashboardState = {
  widgets: WidgetInstance[];
  layout: Layout;
  columns: number;
  editing: boolean;
  lastAddedId: string | null;
  addWidget: (type: WidgetType, position?: { x: number; y: number }) => void;
  removeWidget: (id: string) => void;
  setLayout: (layout: Layout) => void;
  setColumns: (columns: number) => void;
  toggleEditing: () => void;
  clearLastAdded: () => void;
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

const persistedSchema = z.object({
  widgets: z.array(z.unknown()),
  layout: z.array(layoutItemSchema),
});

export function reconcilePersisted(
  persisted: unknown,
): { widgets: WidgetInstance[]; layout: Layout } | null {
  const parsed = persistedSchema.safeParse(persisted);
  if (!parsed.success) return null;
  const widgets = parsed.data.widgets
    .map((widget) => widgetInstanceSchema.safeParse(widget))
    .filter((result) => result.success)
    .map((result) => result.data);
  const ids = new Set(widgets.map((widget) => widget.id));
  const layout = parsed.data.layout.filter((item) => ids.has(item.i));
  return { widgets, layout };
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
  const spot = findNearestOpenPosition(base, layout, columns);
  return { ...base, x: spot.x, y: spot.y };
}

function createInstanceId(type: WidgetType): string {
  return `${type}-${crypto.randomUUID()}`;
}

const gatedStorage = createGatedChromeStorage();

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: [],
      layout: [],
      columns: DEFAULT_COLUMNS,
      editing: false,
      lastAddedId: null,
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
        pruneInstance(id);
        set((state) => ({
          widgets: state.widgets.filter((entry) => entry.id !== id),
          layout: state.layout.filter((entry) => entry.i !== id),
        }));
      },
      setLayout: (layout) => set({ layout }),
      setColumns: (columns) => set({ columns }),
      toggleEditing: () => set((state) => ({ editing: !state.editing })),
      clearLastAdded: () => set({ lastAddedId: null }),
    }),
    {
      name: "dashboard",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        widgets: state.widgets,
        layout: state.layout,
      }),
      merge: (persisted, current) => {
        const reconciled = reconcilePersisted(persisted);
        if (!reconciled) return current;
        return { ...current, ...reconciled };
      },
    },
  ),
);
