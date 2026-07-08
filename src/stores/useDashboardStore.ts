import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { Layout, LayoutItem } from "react-grid-layout";
import { createGatedChromeStorage } from "@/lib/storage";
import { getLocal } from "@/lib/local-store";
import { WELCOME_SEEN_KEY } from "@/onboarding";
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

const DEFAULT_COLUMNS = 12;
const CONTENT_MAX_WIDTH = 2400;
const CONTENT_INSET = 100;

const STARTER_WIDGETS: {
  type: WidgetType;
  xFraction: number;
  widthFraction: number;
  y: number;
  h: number;
}[] = [
  { type: "quickAccess", xFraction: 0.0, widthFraction: 0.34, y: 0, h: 8 },
  { type: "weather", xFraction: 0.6, widthFraction: 0.16, y: 0, h: 6 },
  { type: "tasks", xFraction: 0.12, widthFraction: 0.26, y: 8, h: 6 },
  { type: "stocks", xFraction: 0.46, widthFraction: 0.2, y: 6, h: 9 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function starterColumns(): number {
  const contentWidth = Math.min(CONTENT_MAX_WIDTH, window.innerWidth - CONTENT_INSET);
  return gridColumns(contentWidth);
}

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
      seedStarterIfFirstRun: () =>
        set((state) => {
          if (state.widgets.length > 0) return state;
          if (getLocal(WELCOME_SEEN_KEY) !== null) return state;
          const cols = starterColumns();
          const widgets: WidgetInstance[] = [];
          const raw: LayoutItem[] = [];
          for (const entry of STARTER_WIDGETS) {
            const plugin = getWidgetPlugin(entry.type);
            if (!plugin) continue;
            const id = createInstanceId(entry.type);
            const { minW, minH, maxW, maxH } = plugin.defaultLayout;
            const w = clamp(Math.round(cols * entry.widthFraction), minW, maxW);
            const h = clamp(entry.h, minH, maxH);
            const x = clamp(Math.round(cols * entry.xFraction), 0, Math.max(0, cols - w));
            widgets.push({ id, type: entry.type });
            raw.push({ i: id, x, y: entry.y, w, h, minW, minH, maxW, maxH });
          }
          return { widgets, layout: resolveLayoutCollisions(raw, cols, null) };
        }),
    }),
    {
      name: "dashboard",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => (state) => {
        gatedStorage.open();
        state?.seedStarterIfFirstRun();
      },
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
