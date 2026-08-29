import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { mergePersisted, tolerantRecord } from "@/lib/persist";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import {
  bumpSyncNonce,
  createSyncSlice,
  isSyncCoolingDown,
  type SyncSlice,
} from "@/widgets/core/syncSlice";
import type { UnreadCounts } from "@/widgets/email/lib/counts";
import {
  BATCH_SIZES,
  DEFAULT_BATCH,
  EMAIL_VIEWS,
  MAIL_PROVIDERS,
  EMAIL_SYNC_COOLDOWN_MS,
  type BatchSize,
  type EmailView,
  type MailProvider,
} from "@/widgets/email/types";

type EmailData = {
  view: EmailView;
  query: string;
  batch: BatchSize;
  newTab: boolean;
};

export const EMAIL_SYNC_KEY = "email";

type EmailState = SyncSlice & {
  byInstance: Record<string, EmailData>;
  failures: Partial<Record<MailProvider, string>>;
  unread: UnreadCounts;
  setView: (instanceId: string, view: EmailView) => void;
  setQuery: (instanceId: string, query: string) => void;
  setBatch: (instanceId: string, batch: BatchSize) => void;
  setNewTab: (instanceId: string, newTab: boolean) => void;
  reportFailures: (queried: MailProvider[], reasons: Partial<Record<MailProvider, string>>) => void;
  reportUnread: (unread: UnreadCounts) => void;
  requestSync: () => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: EmailData = {
  view: "all",
  query: "",
  batch: DEFAULT_BATCH,
  newTab: true,
};

const dataSchema = z.object({
  view: z.enum(EMAIL_VIEWS).catch(DEFAULT_DATA.view),
  batch: z.enum(BATCH_SIZES).catch(DEFAULT_DATA.batch),
  newTab: z.boolean().catch(DEFAULT_DATA.newTab),
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(dataSchema),
});

const gatedStorage = createGatedChromeStorage();

export const useEmailStore = create<EmailState>()(
  persist(
    (set, get) => ({
      ...createSyncSlice(set),
      byInstance: {},
      failures: {},
      unread: {},
      setView: (instanceId, view) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            view,
          })),
        })),
      setQuery: (instanceId, query) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            query,
          })),
        })),
      setBatch: (instanceId, batch) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            batch,
          })),
        })),
      setNewTab: (instanceId, newTab) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            newTab,
          })),
        })),
      reportFailures: (queried, reasons) =>
        set((state) => {
          const failures = { ...state.failures };
          for (const provider of queried) failures[provider] = reasons[provider];
          return MAIL_PROVIDERS.some((provider) => state.failures[provider] !== failures[provider])
            ? { failures }
            : state;
        }),
      reportUnread: (unread) => set({ unread }),
      requestSync: () => {
        if (isSyncCoolingDown(get(), EMAIL_SYNC_KEY, EMAIL_SYNC_COOLDOWN_MS)) return;
        set((state) => bumpSyncNonce(state, EMAIL_SYNC_KEY));
      },
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
    }),
    {
      name: "widget:email",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(useEmailStore),
      migrate: (persisted) => persisted,
      partialize: (state) => ({
        byInstance: Object.fromEntries(
          Object.entries(state.byInstance).map(([id, data]) => [
            id,
            {
              view: data.view,
              batch: data.batch,
              newTab: data.newTab,
            },
          ]),
        ),
      }),
      merge: (persisted, current) =>
        mergePersisted("widget:email", persistedSchema, persisted, current, (parsed) => {
          const byInstance: Record<string, EmailData> = {};
          for (const [id, data] of Object.entries(parsed.byInstance)) {
            byInstance[id] = {
              ...DEFAULT_DATA,
              view: data.view,
              batch: data.batch,
              newTab: data.newTab,
            };
          }
          return { ...current, byInstance };
        }),
    },
  ),
);

registerInstanceCleanup((instanceId) => useEmailStore.getState().removeInstance(instanceId));

export const useEmail = createInstanceSelector(useEmailStore, DEFAULT_DATA);
