import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { getNextSequentialIndex, getRandomIndexExcluding } from "@/widgets/image/lib/rotation";
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

type ImageState = {
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
  currentIndex: number;
  setMode: (mode: ImageMode) => void;
  setSingle: (single: ImageItem | null) => void;
  setItems: (items: ImageItem[]) => void;
  setRotateOnNewtab: (value: boolean) => void;
  setRotateTimed: (value: boolean) => void;
  setRotateOnClick: (value: boolean) => void;
  setIntervalSeconds: (seconds: number) => void;
  setOrder: (order: ImageOrder) => void;
  setFit: (fit: ImageFit) => void;
  setBrightness: (brightness: ImageBrightness) => void;
  setHideFrame: (hideFrame: boolean) => void;
  setCurrentIndex: (index: number) => void;
  advanceImage: () => void;
};

const itemSchema = z.object({
  assetId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const persistedSchema = z.object({
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

function clampInterval(seconds: number): number {
  if (!Number.isFinite(seconds)) return 30;
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, Math.round(seconds)));
}

function normalizeIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

const gatedStorage = createGatedChromeStorage();

export const useImageStore = create<ImageState>()(
  persist(
    (set) => ({
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
      currentIndex: 0,
      setMode: (mode) => set({ mode }),
      setSingle: (single) => set({ single }),
      setItems: (items) => set({ items: items.slice(0, MAX_MULTI_IMAGES) }),
      setRotateOnNewtab: (rotateOnNewtab) => set({ rotateOnNewtab }),
      setRotateTimed: (rotateTimed) => set({ rotateTimed }),
      setRotateOnClick: (rotateOnClick) => set({ rotateOnClick }),
      setIntervalSeconds: (seconds) => set({ intervalSeconds: clampInterval(seconds) }),
      setOrder: (order) => set({ order }),
      setFit: (fit) => set({ fit }),
      setBrightness: (brightness) => set({ brightness }),
      setHideFrame: (hideFrame) => set({ hideFrame }),
      setCurrentIndex: (currentIndex) => set({ currentIndex }),
      advanceImage: () =>
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
    }),
    {
      name: "widget:image",
      storage: createJSONStorage(() => gatedStorage),
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        mode: state.mode,
        single: state.single,
        items: state.items,
        rotateOnNewtab: state.rotateOnNewtab,
        rotateTimed: state.rotateTimed,
        rotateOnClick: state.rotateOnClick,
        intervalSeconds: state.intervalSeconds,
        order: state.order,
        fit: state.fit,
        brightness: state.brightness,
        hideFrame: state.hideFrame,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return {
          ...current,
          ...parsed.data,
          intervalSeconds: clampInterval(parsed.data.intervalSeconds),
        };
      },
    },
  ),
);
