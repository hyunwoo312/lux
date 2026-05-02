import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import type { Layout } from "react-grid-layout";
import { chromeStorageAdapter } from "@/lib/storage";
import type { WidgetInstance, WidgetType } from "@/widgets/core/types";
import { getWidgetPlugin } from "@/widgets/registry";

type DashboardState = {
  widgets: WidgetInstance[];
  layout: Layout;
  editing: boolean;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  setLayout: (layout: Layout) => void;
  toggleEditing: () => void;
};

const persistedSchema = z.object({
  widgets: z.array(z.object({ id: z.string(), type: z.enum(["clock"]) })),
  layout: z.array(
    z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      minW: z.number().optional(),
      minH: z.number().optional(),
      maxW: z.number().optional(),
      maxH: z.number().optional(),
    }),
  ),
});

function placeWidget(layout: Layout, id: string, type: WidgetType): Layout {
  const plugin = getWidgetPlugin(type);
  if (!plugin) return layout;
  const { w, h, minW, minH, maxW, maxH } = plugin.defaultLayout;
  const bottom = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  return [...layout, { i: id, x: 0, y: bottom, w, h, minW, minH, maxW, maxH }];
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: [],
      layout: [],
      editing: false,
      addWidget: (type) =>
        set((state) => {
          const id = crypto.randomUUID();
          return {
            widgets: [...state.widgets, { id, type }],
            layout: placeWidget(state.layout, id, type),
          };
        }),
      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((widget) => widget.id !== id),
          layout: state.layout.filter((item) => item.i !== id),
        })),
      setLayout: (layout) => set({ layout }),
      toggleEditing: () => set((state) => ({ editing: !state.editing })),
    }),
    {
      name: "dashboard",
      storage: createJSONStorage(() => chromeStorageAdapter),
      version: 1,
      partialize: (state) => ({ widgets: state.widgets, layout: state.layout }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, widgets: parsed.data.widgets, layout: parsed.data.layout };
      },
    },
  ),
);
