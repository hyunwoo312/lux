import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createAssetStore, missingAssetIds, type MediaImageItem } from "@/lib/asset-store";
import { encodeToWebp, isOptimizedMimeType } from "@/lib/image-encode";
import { getLocal, setLocal } from "@/lib/local-store";
import {
  getNextSequentialIndex,
  getRandomIndexExcluding,
  mediaList,
  normalizeIndex,
} from "@/lib/media-rotation";
import { keepPersisted, mergePersisted, tolerantArray } from "@/lib/persist";
import { createGatedChromeStorage } from "@/lib/storage";
import { GALLERY_ASSET_PREFIX, GALLERY_WALLPAPERS, galleryAssetId } from "@/lib/wallpaper-gallery";

const WALLPAPER_MODES = ["single", "multi"] as const;
export type WallpaperMode = (typeof WALLPAPER_MODES)[number];

const WALLPAPER_FITS = ["cover", "contain", "fill", "scale-down"] as const;
export type WallpaperFit = (typeof WALLPAPER_FITS)[number];

const WALLPAPER_ORDERS = ["shuffle", "sequential"] as const;
export type WallpaperOrder = (typeof WALLPAPER_ORDERS)[number];

const WALLPAPER_SOURCES = ["generated", "gallery", "custom"] as const;
export type WallpaperSource = (typeof WALLPAPER_SOURCES)[number];

const GENERATED_STYLES = ["mesh", "aurora", "bloom", "still"] as const;
export type GeneratedStyle = (typeof GENERATED_STYLES)[number];

export const GENERATED_MIN_INTENSITY = 0.2;
export const GENERATED_MAX_INTENSITY = 1;

export const WALLPAPER_MAX_BYTES = 10 * 1024 * 1024;
export const WALLPAPER_ENCODE_QUALITY = 0.9;
export const MAX_WALLPAPER_IMAGES = 12;
const WALLPAPER_MIN_INTERVAL = 15;
const WALLPAPER_MAX_INTERVAL = 300;
export const WALLPAPER_MAX_DIM = 0.85;
export const WALLPAPER_MAX_BLUR = 24;
export const WALLPAPER_BLEED_PER_BLUR_PX = 2;

export const wallpaperAssets = createAssetStore("lux.wallpaper-media");

const DEFAULT_GALLERY_ID = GALLERY_WALLPAPERS[0]?.id ?? "";

type WallpaperState = {
  source: WallpaperSource;
  generatedStyle: GeneratedStyle;
  generatedMotion: boolean;
  generatedIntensity: number;
  generatedDensity: number;
  generatedSpeed: number;
  gallerySingle: string | null;
  galleryItems: string[];
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
  setSource: (source: WallpaperSource) => void;
  setGeneratedStyle: (style: GeneratedStyle) => void;
  setGeneratedMotion: (value: boolean) => void;
  setGeneratedIntensity: (value: number) => void;
  setGeneratedDensity: (value: number) => void;
  setGeneratedSpeed: (value: number) => void;
  setGallerySingle: (id: string | null) => void;
  setGalleryItems: (ids: string[]) => void;
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
  optimizeAssets: () => Promise<void>;
  reset: () => void;
};

const OPTIMIZE_CHECKED_KEY = "lux.wallpaper.optimized-at";

type AssetEncoding = Pick<MediaImageItem, "mimeType" | "size">;

async function reencodeStoredAsset(assetId: string): Promise<AssetEncoding | null> {
  try {
    const asset = await wallpaperAssets.read(assetId);
    if (!asset) return null;
    const blob = await encodeToWebp(asset.blob, { quality: WALLPAPER_ENCODE_QUALITY });
    if (blob === asset.blob) return null;
    const encoding: AssetEncoding = { mimeType: blob.type, size: blob.size };
    await wallpaperAssets.save({
      ...asset,
      ...encoding,
      blob,
      frost: undefined,
      frostVersion: undefined,
      thumb: undefined,
      thumbVersion: undefined,
    });
    return encoding;
  } catch {
    return null;
  }
}

function whenIdle(task: () => void): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => task(), { timeout: 10_000 });
    return;
  }
  setTimeout(task, 2_000);
}

const DEFAULTS = {
  source: "generated" as WallpaperSource,
  generatedStyle: "still" as GeneratedStyle,
  generatedMotion: true,
  generatedIntensity: 0.6,
  generatedDensity: 0.7,
  generatedSpeed: 0.5,
  gallerySingle: null as string | null,
  galleryItems: [] as string[],
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

const persistedSchema = z.object({
  source: z.enum(WALLPAPER_SOURCES).optional().catch(undefined),
  generatedStyle: z.enum(GENERATED_STYLES).catch(DEFAULTS.generatedStyle),
  generatedMotion: z.boolean().catch(DEFAULTS.generatedMotion),
  generatedIntensity: z.number().catch(DEFAULTS.generatedIntensity),
  generatedDensity: z.number().catch(DEFAULTS.generatedDensity),
  generatedSpeed: z.number().catch(DEFAULTS.generatedSpeed),
  gallerySingle: z.string().nullable().catch(DEFAULTS.gallerySingle),
  galleryItems: tolerantArray(z.string()),
  mode: z.enum(WALLPAPER_MODES).catch(DEFAULTS.mode),
  single: itemSchema.nullable().catch(DEFAULTS.single),
  items: tolerantArray(itemSchema),
  rotateOnNewtab: z.boolean().catch(DEFAULTS.rotateOnNewtab),
  rotateTimed: z.boolean().catch(DEFAULTS.rotateTimed),
  intervalSeconds: z.number().catch(DEFAULTS.intervalSeconds),
  order: z.enum(WALLPAPER_ORDERS).catch(DEFAULTS.order),
  fit: z.enum(WALLPAPER_FITS).catch(DEFAULTS.fit),
  dim: z.number().catch(DEFAULTS.dim),
  blur: z.number().catch(DEFAULTS.blur),
});

export function resolveWallpaperSource(
  stored: WallpaperSource | undefined,
  hasOwnImages: boolean,
  fallback: WallpaperSource,
): WallpaperSource {
  if (stored) return stored;
  return hasOwnImages ? "custom" : fallback;
}

function clampIntensity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.generatedIntensity;
  const stepped = Math.round(value * 20) / 20;
  return Math.min(GENERATED_MAX_INTENSITY, Math.max(GENERATED_MIN_INTENSITY, stepped));
}

function clampRange(value: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(0, value));
}

function clampInterval(seconds: number): number {
  if (!Number.isFinite(seconds)) return 30;
  return Math.min(WALLPAPER_MAX_INTERVAL, Math.max(WALLPAPER_MIN_INTERVAL, Math.round(seconds)));
}

type WallpaperSelection = Pick<
  WallpaperState,
  "source" | "mode" | "single" | "items" | "gallerySingle" | "galleryItems"
>;

export function activeWallpaperIds(selection: WallpaperSelection): string[] {
  if (selection.source === "gallery") {
    const { mode, gallerySingle, galleryItems } = selection;
    return mediaList({ mode, single: gallerySingle, items: galleryItems });
  }
  return mediaList(selection).map((item) => item.assetId);
}

const gatedStorage = createGatedChromeStorage();

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setSource: (source) =>
        set((state) => {
          if (source !== "gallery") return { source };
          return {
            source,
            gallerySingle: state.gallerySingle ?? DEFAULT_GALLERY_ID,
            galleryItems: state.galleryItems.length ? state.galleryItems : [DEFAULT_GALLERY_ID],
          };
        }),
      setGeneratedStyle: (generatedStyle) => set({ generatedStyle }),
      setGeneratedMotion: (generatedMotion) => set({ generatedMotion }),
      setGeneratedIntensity: (value) => set({ generatedIntensity: clampIntensity(value) }),
      setGeneratedDensity: (value) => set({ generatedDensity: clampIntensity(value) }),
      setGeneratedSpeed: (value) => set({ generatedSpeed: clampIntensity(value) }),
      setGallerySingle: (gallerySingle) => set({ gallerySingle }),
      setGalleryItems: (galleryItems) =>
        set({ galleryItems: galleryItems.slice(0, MAX_WALLPAPER_IMAGES) }),
      setMode: (mode) => set({ mode }),
      setSingle: (single) => set({ single }),
      setItems: (items) => set({ items: items.slice(0, MAX_WALLPAPER_IMAGES) }),
      setRotateOnNewtab: (rotateOnNewtab) => set({ rotateOnNewtab }),
      setRotateTimed: (rotateTimed) => set({ rotateTimed }),
      setIntervalSeconds: (seconds) => set({ intervalSeconds: clampInterval(seconds) }),
      setOrder: (order) => set({ order }),
      setFit: (fit) => set({ fit }),
      setDim: (dim) => set({ dim: clampRange(dim, WALLPAPER_MAX_DIM, DEFAULTS.dim) }),
      setBlur: (blur) => set({ blur: clampRange(blur, WALLPAPER_MAX_BLUR, DEFAULTS.blur) }),
      setCurrentIndex: (currentIndex) => set({ currentIndex }),
      advance: () =>
        set((state) => {
          const length = activeWallpaperIds(state).length;
          if (state.mode !== "multi" || length < 2) return state;
          const current = normalizeIndex(state.currentIndex, length);
          const next =
            state.order === "shuffle"
              ? getRandomIndexExcluding(length, current)
              : getNextSequentialIndex(current, length);
          return { currentIndex: next };
        }),
      sanitizeAssets: async () => {
        const { single, items, gallerySingle, galleryItems } = get();
        const missing = await missingAssetIds(wallpaperAssets, [single, ...items]);
        if (missing.size) {
          set((state) => ({
            single: state.single && missing.has(state.single.assetId) ? null : state.single,
            items: state.items.filter((item) => !missing.has(item.assetId)),
          }));
        }
        const keep = new Set(
          [gallerySingle, ...galleryItems]
            .filter((id): id is string => id !== null)
            .map(galleryAssetId),
        );
        const stored = await wallpaperAssets.keys().catch(() => new Set<string>());
        for (const key of stored) {
          if (key.startsWith(GALLERY_ASSET_PREFIX) && !keep.has(key)) {
            await wallpaperAssets.remove(key).catch(() => undefined);
          }
        }
      },
      optimizeAssets: async () => {
        if (getLocal(OPTIMIZE_CHECKED_KEY) !== null) return;
        setLocal(OPTIMIZE_CHECKED_KEY, String(Date.now()));
        const { single, items } = get();
        const stale = [single, ...items].filter(
          (item): item is MediaImageItem => item !== null && !isOptimizedMimeType(item.mimeType),
        );
        for (const item of stale) {
          const encoding = await reencodeStoredAsset(item.assetId);
          if (!encoding) continue;
          set((state) => ({
            single:
              state.single?.assetId === item.assetId
                ? { ...state.single, ...encoding }
                : state.single,
            items: state.items.map((entry) =>
              entry.assetId === item.assetId ? { ...entry, ...encoding } : entry,
            ),
          }));
        }
      },
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "wallpaper",
      storage: gatedStorage,
      version: 1,
      migrate: keepPersisted,
      onRehydrateStorage: () => (state) => {
        if (gatedStorage.open(useWallpaperStore) !== "boot") return;
        if (!state) return;
        void state
          .sanitizeAssets()
          .catch(() => undefined)
          .then(() => whenIdle(() => void state.optimizeAssets()));
      },
      partialize: (state) => ({
        source: state.source,
        generatedStyle: state.generatedStyle,
        generatedMotion: state.generatedMotion,
        generatedIntensity: state.generatedIntensity,
        generatedDensity: state.generatedDensity,
        generatedSpeed: state.generatedSpeed,
        gallerySingle: state.gallerySingle,
        galleryItems: state.galleryItems,
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
      merge: (persisted, current) =>
        mergePersisted("wallpaper", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          ...parsed,
          galleryItems: parsed.galleryItems.slice(0, MAX_WALLPAPER_IMAGES),
          items: parsed.items.slice(0, MAX_WALLPAPER_IMAGES),
          source: resolveWallpaperSource(
            parsed.source,
            Boolean(parsed.single) || parsed.items.length > 0,
            current.source,
          ),
          intervalSeconds: clampInterval(parsed.intervalSeconds),
          generatedIntensity: clampIntensity(parsed.generatedIntensity),
          generatedDensity: clampIntensity(parsed.generatedDensity),
          generatedSpeed: clampIntensity(parsed.generatedSpeed),
          dim: clampRange(parsed.dim, WALLPAPER_MAX_DIM, DEFAULTS.dim),
          blur: clampRange(parsed.blur, WALLPAPER_MAX_BLUR, DEFAULTS.blur),
        })),
    },
  ),
);

export async function clearWallpaperAssets(): Promise<void> {
  const stored = await wallpaperAssets.keys().catch(() => new Set<string>());
  await Promise.all([...stored].map((id) => wallpaperAssets.remove(id).catch(() => undefined)));
}
