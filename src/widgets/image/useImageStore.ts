import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { missingAssetIds } from "@/lib/asset-store";
import { getNextSequentialIndex, getRandomIndexExcluding } from "@/lib/media-rotation";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector, useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { deleteImageAsset, imageAssetStore } from "@/widgets/image/media";
import {
  IMAGE_BRIGHTNESS_MODES,
  IMAGE_FIT_MODES,
  IMAGE_MODES,
  IMAGE_ORDER_MODES,
  MAX_INTERVAL_SECONDS,
  MAX_MULTI_IMAGES,
  MIN_INTERVAL_SECONDS,
  type ImageBrightness,
  type ImageFit,
  type ImageItem,
  type ImageMode,
  type ImageOrder,
} from "@/widgets/image/types";

type ImageConfig = {
  mode: ImageMode;
  single: ImageItem | null;
  items: ImageItem[];
  rotateOnNewtab: boolean;
  rotateTimed: boolean;
  rotateOnClick: boolean;
  intervalSeconds: number;
  order: ImageOrder;
  fit: ImageFit;
  brightness: ImageBrightness;
  hideFrame: boolean;
};

type ImageState = {
  byInstance: Record<string, ImageConfig>;
  indices: Record<string, number>;
  setMode: (instanceId: string, mode: ImageMode) => void;
  setSingle: (instanceId: string, single: ImageItem | null) => void;
  setItems: (instanceId: string, items: ImageItem[]) => void;
  setRotateOnNewtab: (instanceId: string, value: boolean) => void;
  setRotateTimed: (instanceId: string, value: boolean) => void;
  setRotateOnClick: (instanceId: string, value: boolean) => void;
  setIntervalSeconds: (instanceId: string, seconds: number) => void;
  setOrder: (instanceId: string, order: ImageOrder) => void;
  setFit: (instanceId: string, fit: ImageFit) => void;
  setBrightness: (instanceId: string, brightness: ImageBrightness) => void;
  setHideFrame: (instanceId: string, hideFrame: boolean) => void;
  setCurrentIndex: (instanceId: string, index: number) => void;
  advanceImage: (instanceId: string) => void;
  sanitizeAssets: () => Promise<void>;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_CONFIG: ImageConfig = {
  mode: "single",
  single: null,
  items: [],
  rotateOnNewtab: true,
  rotateTimed: false,
  rotateOnClick: false,
  intervalSeconds: 30,
  order: "shuffle",
  fit: "cover",
  brightness: "normal",
  hideFrame: false,
};

const itemSchema = z.object({
  assetId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const configSchema = z.object({
  mode: z.enum(IMAGE_MODES).default("single"),
  single: itemSchema.nullable().default(null),
  items: z.array(itemSchema).max(MAX_MULTI_IMAGES).default([]),
  rotateOnNewtab: z.boolean().default(true),
  rotateTimed: z.boolean().default(false),
  rotateOnClick: z.boolean().default(false),
  intervalSeconds: z.number().default(30),
  order: z.enum(IMAGE_ORDER_MODES).default("shuffle"),
  fit: z.enum(IMAGE_FIT_MODES).default("cover"),
  brightness: z.enum(IMAGE_BRIGHTNESS_MODES).default("normal"),
  hideFrame: z.boolean().default(false),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), configSchema),
});

function clampInterval(seconds: number): number {
  if (!Number.isFinite(seconds)) return 30;
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, Math.round(seconds)));
}

function normalizeIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

const gatedStorage = createGatedChromeStorage();

function update(
  state: ImageState,
  instanceId: string,
  fn: (config: ImageConfig) => ImageConfig,
): Pick<ImageState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_CONFIG, fn) };
}

export const useImageStore = create<ImageState>()(
  persist(
    (set, get) => ({
      byInstance: {},
      indices: {},
      setMode: (instanceId, mode) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, mode }))),
      setSingle: (instanceId, single) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, single }))),
      setItems: (instanceId, items) =>
        set((state) =>
          update(state, instanceId, (config) => ({
            ...config,
            items: items.slice(0, MAX_MULTI_IMAGES),
          })),
        ),
      setRotateOnNewtab: (instanceId, rotateOnNewtab) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, rotateOnNewtab }))),
      setRotateTimed: (instanceId, rotateTimed) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, rotateTimed }))),
      setRotateOnClick: (instanceId, rotateOnClick) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, rotateOnClick }))),
      setIntervalSeconds: (instanceId, seconds) =>
        set((state) =>
          update(state, instanceId, (config) => ({
            ...config,
            intervalSeconds: clampInterval(seconds),
          })),
        ),
      setOrder: (instanceId, order) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, order }))),
      setFit: (instanceId, fit) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, fit }))),
      setBrightness: (instanceId, brightness) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, brightness }))),
      setHideFrame: (instanceId, hideFrame) =>
        set((state) => update(state, instanceId, (config) => ({ ...config, hideFrame }))),
      setCurrentIndex: (instanceId, index) =>
        set((state) => ({ indices: { ...state.indices, [instanceId]: index } })),
      advanceImage: (instanceId) =>
        set((state) => {
          const config = state.byInstance[instanceId] ?? DEFAULT_CONFIG;
          const length = config.items.length;
          if (config.mode !== "multi" || length < 2) return state;
          const current = normalizeIndex(state.indices[instanceId] ?? 0, length);
          const next =
            config.order === "shuffle"
              ? getRandomIndexExcluding(length, current)
              : getNextSequentialIndex(current, length);
          return { indices: { ...state.indices, [instanceId]: next } };
        }),
      sanitizeAssets: async () => {
        const configs = Object.values(get().byInstance);
        const referenced: (ImageItem | null)[] = [];
        for (const config of configs) referenced.push(config.single, ...config.items);
        const missing = await missingAssetIds(imageAssetStore, referenced);
        if (!missing.size) return;
        set((state) => {
          const byInstance: Record<string, ImageConfig> = {};
          for (const [id, config] of Object.entries(state.byInstance)) {
            byInstance[id] = {
              ...config,
              single: config.single && missing.has(config.single.assetId) ? null : config.single,
              items: config.items.filter((item) => !missing.has(item.assetId)),
            };
          }
          return { byInstance };
        });
      },
      removeInstance: (instanceId) => {
        const config = get().byInstance[instanceId];
        if (config) {
          const assetIds = [config.single?.assetId, ...config.items.map((item) => item.assetId)];
          for (const assetId of assetIds) {
            if (assetId) void deleteImageAsset(assetId).catch(() => undefined);
          }
        }
        set((state) => {
          const indices = { ...state.indices };
          delete indices[instanceId];
          return { byInstance: dropInstance(state.byInstance, instanceId), indices };
        });
      },
    }),
    {
      name: "widget:image",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => (state) => {
        gatedStorage.open();
        void state?.sanitizeAssets();
      },
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = configSchema.safeParse(persisted);
        return { byInstance: legacy.success ? { image: legacy.data } : {} };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const byInstance: Record<string, ImageConfig> = {};
        for (const [id, config] of Object.entries(parsed.data.byInstance)) {
          byInstance[id] = { ...config, intervalSeconds: clampInterval(config.intervalSeconds) };
        }
        return { ...current, byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useImageStore.getState().removeInstance(instanceId));

export const useImage = createInstanceSelector(useImageStore, DEFAULT_CONFIG);

export function useImageIndex(): number {
  const id = useWidgetInstanceId();
  return useImageStore((s) => s.indices[id] ?? 0);
}
