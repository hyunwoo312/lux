import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import type { Layout, LayoutItem } from "react-grid-layout";
import { chromeStorageAdapter } from "@/lib/storage";
import { findNearestOpenPosition, PLACEMENT_VECTOR } from "@/widgets/core/layout-engine";
import type { WidgetInstance, WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { WIDGET_TYPES } from "@/widgets/core/types";
import { getWidgetPlugin } from "@/widgets/registry";

const DEFAULT_COLUMNS = 12;

type SavedLayouts = Partial<Record<WidgetType, LayoutItem>>;

type DashboardState = {
  widgets: WidgetInstance[];
  layout: Layout;
  savedLayouts: SavedLayouts;
  columns: number;
  editing: boolean;
  addWidget: (type: WidgetType, position?: { x: number; y: number }) => void;
  removeWidget: (id: string) => void;
  setLayout: (layout: Layout) => void;
  setColumns: (columns: number) => void;
  toggleEditing: () => void;
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

const persistedSchema = z.object({
  widgets: z.array(z.object({ id: z.string(), type: widgetTypeSchema })),
  layout: z.array(layoutItemSchema),
  savedLayouts: z.record(z.string(), layoutItemSchema).optional(),
});

function placeLayoutItem(
  layout: Layout,
  columns: number,
  id: string,
  plugin: WidgetPlugin,
  override: { x: number; y: number; w?: number; h?: number } | undefined,
): LayoutItem {
  const { w, h, minW, minH, maxW, maxH } = plugin.defaultLayout;
  const base: LayoutItem = {
    i: id,
    x: override?.x ?? 0,
    y: override?.y ?? 0,
    w: override?.w ?? w,
    h: override?.h ?? h,
    minW,
    minH,
    maxW,
    maxH,
  };
  const spot = findNearestOpenPosition(base, layout, columns, PLACEMENT_VECTOR);
  return { ...base, x: spot.x, y: spot.y };
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: [],
      layout: [],
      savedLayouts: {},
      columns: DEFAULT_COLUMNS,
      editing: false,
      addWidget: (type, position) =>
        set((state) => {
          if (state.widgets.some((widget) => widget.type === type)) return state;
          const plugin = getWidgetPlugin(type);
          if (!plugin) return state;
          const id = type;
          const saved = state.savedLayouts[type];
          const override = position
            ? { x: position.x, y: position.y, w: saved?.w, h: saved?.h }
            : saved;
          const item = placeLayoutItem(state.layout, state.columns, id, plugin, override);
          const savedLayouts = { ...state.savedLayouts };
          delete savedLayouts[type];
          return {
            widgets: [...state.widgets, { id, type }],
            layout: [...state.layout, item],
            savedLayouts,
          };
        }),
      removeWidget: (id) =>
        set((state) => {
          const widget = state.widgets.find((entry) => entry.id === id);
          const item = state.layout.find((entry) => entry.i === id);
          const savedLayouts =
            widget && item ? { ...state.savedLayouts, [widget.type]: item } : state.savedLayouts;
          return {
            widgets: state.widgets.filter((entry) => entry.id !== id),
            layout: state.layout.filter((entry) => entry.i !== id),
            savedLayouts,
          };
        }),
      setLayout: (layout) => set({ layout }),
      setColumns: (columns) => set({ columns }),
      toggleEditing: () => set((state) => ({ editing: !state.editing })),
    }),
    {
      name: "dashboard",
      storage: createJSONStorage(() => chromeStorageAdapter),
      version: 1,
      partialize: (state) => ({
        widgets: state.widgets,
        layout: state.layout,
        savedLayouts: state.savedLayouts,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return {
          ...current,
          widgets: parsed.data.widgets,
          layout: parsed.data.layout,
          savedLayouts: parsed.data.savedLayouts ?? {},
        };
      },
    },
  ),
);
