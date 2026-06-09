import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createAssetStore, missingAssetIds, type MediaImageItem } from "@/lib/asset-store";
import { getNextSequentialIndex, getRandomIndexExcluding } from "@/lib/media-rotation";
import { createGatedChromeStorage } from "@/lib/storage";

export const WALLPAPER_MODES = ["single", "multi"] as const;
export type WallpaperMode = (typeof WALLPAPER_MODES)[number];

export const WALLPAPER_FITS = ["cover", "contain", "fill", "scale-down"] as const;
export type WallpaperFit = (typeof WALLPAPER_FITS)[number];

export const WALLPAPER_ORDERS = ["shuffle", "sequential"] as const;
export type WallpaperOrder = (typeof WALLPAPER_ORDERS)[number];

export const WALLPAPER_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_WALLPAPER_IMAGES = 12;
const WALLPAPER_MIN_INTERVAL = 15;
const WALLPAPER_MAX_INTERVAL = 300;
export const WALLPAPER_MAX_DIM = 0.85;
export const WALLPAPER_MAX_BLUR = 24;

export const wallpaperAssets = createAssetStore("lux.wallpaper-media");

type WallpaperState = {
  enabled: boolean;
  mode: WallpaperMode;
  single: MediaImageItem | null;
  items: MediaImageItem[];
  rotateOnNewtab: boolean;
  rotateTimed: boolean;
  intervalSeconds: number;
  order: WallpaperOrder;
  fit: WallpaperFit;
  dim: number;
  blur: number;
  currentIndex: number;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: WallpaperMode) => void;
  setSingle: (single: MediaImageItem | null) => void;
  setItems: (items: MediaImageItem[]) => void;
  setRotateOnNewtab: (value: boolean) => void;
  setRotateTimed: (value: boolean) => void;
  setIntervalSeconds: (seconds: number) => void;
  setOrder: (order: WallpaperOrder) => void;
  setFit: (fit: WallpaperFit) => void;
  setDim: (dim: number) => void;
  setBlur: (blur: number) => void;
  setCurrentIndex: (index: number) => void;
  advance: () => void;
  sanitizeAssets: () => Promise<void>;
  reset: () => void;
};

const DEFAULTS = {
  enabled: true,
  mode: "single" as WallpaperMode,
  single: null as MediaImageItem | null,
  items: [] as MediaImageItem[],
  rotateOnNewtab: true,
  rotateTimed: false,
  intervalSeconds: 30,
  order: "shuffle" as WallpaperOrder,
  fit: "cover" as WallpaperFit,
  dim: 0.3,
  blur: 0,
  currentIndex: 0,
};

const itemSchema = z.object({
  assetId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const persistedSchema = z
  .object({
    enabled: z.boolean(),
    mode: z.enum(WALLPAPER_MODES),
    single: itemSchema.nullable(),
    items: z.array(itemSchema).max(MAX_WALLPAPER_IMAGES),
    rotateOnNewtab: z.boolean(),
    rotateTimed: z.boolean(),
    intervalSeconds: z.number(),
    order: z.enum(WALLPAPER_ORDERS),
    fit: z.enum(WALLPAPER_FITS),
    dim: z.number(),
    blur: z.number(),
  })
  .partial();

function clampInterval(seconds: number): number {
  if (!Number.isFinite(seconds)) return 30;
  return Math.min(WALLPAPER_MAX_INTERVAL, Math.max(WALLPAPER_MIN_INTERVAL, Math.round(seconds)));
}

function normalizeIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

const gatedStorage = createGatedChromeStorage();

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setEnabled: (enabled) => set({ enabled }),
      setMode: (mode) => set({ mode }),
      setSingle: (single) => set({ single }),
      setItems: (items) => set({ items: items.slice(0, MAX_WALLPAPER_IMAGES) }),
      setRotateOnNewtab: (rotateOnNewtab) => set({ rotateOnNewtab }),
      setRotateTimed: (rotateTimed) => set({ rotateTimed }),
      setIntervalSeconds: (seconds) => set({ intervalSeconds: clampInterval(seconds) }),
      setOrder: (order) => set({ order }),
      setFit: (fit) => set({ fit }),
      setDim: (dim) => set({ dim }),
      setBlur: (blur) => set({ blur }),
      setCurrentIndex: (currentIndex) => set({ currentIndex }),
      advance: () =>
        set((state) => {
          const length = state.items.length;
          if (state.mode !== "multi" || length < 2) return state;
          const current = normalizeIndex(state.currentIndex, length);
          const next =
            state.order === "shuffle"
              ? getRandomIndexExcluding(length, current)
              : getNextSequentialIndex(current, length);
          return { currentIndex: next };
        }),
      sanitizeAssets: async () => {
        const { single, items } = get();
        const missing = await missingAssetIds(wallpaperAssets, [single, ...items]);
        if (!missing.size) return;
        set((state) => ({
          single: state.single && missing.has(state.single.assetId) ? null : state.single,
          items: state.items.filter((item) => !missing.has(item.assetId)),
        }));
      },
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "wallpaper",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => (state) => {
        gatedStorage.open();
        void state?.sanitizeAssets();
      },
      partialize: (state) => ({
        enabled: state.enabled,
        mode: state.mode,
        single: state.single,
        items: state.items,
        rotateOnNewtab: state.rotateOnNewtab,
        rotateTimed: state.rotateTimed,
        intervalSeconds: state.intervalSeconds,
        order: state.order,
        fit: state.fit,
        dim: state.dim,
        blur: state.blur,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return {
          ...current,
          ...parsed.data,
          intervalSeconds: clampInterval(parsed.data.intervalSeconds ?? current.intervalSeconds),
        };
      },
    },
  ),
);

export async function clearWallpaperAssets(): Promise<void> {
  const { single, items } = useWallpaperStore.getState();
  const ids = [single?.assetId, ...items.map((item) => item.assetId)].filter(
    (id): id is string => Boolean(id),
  );
  await Promise.all(ids.map((id) => wallpaperAssets.remove(id).catch(() => undefined)));
}
