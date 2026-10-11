// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { flushStorageWrites } from "@/lib/storage";
import { reportStorageSuccess, retryStorageWrites, storageFailures } from "@/lib/storage-status";
import { readNoteDraft, saveNoteDraft } from "@/widgets/note/lib/drafts";
import { useNoteStore } from "@/widgets/note/useNoteStore";

beforeEach(async () => {
  for (const failure of storageFailures()) reportStorageSuccess(failure.name, undefined);
  await flushStorageWrites();
  await useNoteStore.persist.rehydrate();
});

it("retains a recovery draft after a failed write and retries the actual edit", async () => {
  useNoteStore.setState({ byInstance: { a: { text: "before", fontSize: "base", updatedAt: 1 } } });
  await flushStorageWrites();
  const draft = saveNoteDraft("a", "after", "before", 1);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(chrome.storage.local, "set").mockRejectedValueOnce(new Error("write failed"));
  useNoteStore.getState().setText("a", draft.text, draft.at);
  await flushStorageWrites();
  expect(readNoteDraft("a")?.text).toBe("after");
  expect(storageFailures().some((failure) => failure.name === "widget:note")).toBe(true);
  await retryStorageWrites();
  expect((await chrome.storage.local.get(null))["lux:widget:note"]).toMatchObject({
    state: { byInstance: { a: { text: "after" } } },
  });
  expect(readNoteDraft("a")).toBeUndefined();
});

it("merges separate notes and refuses an older text write under the storage lock", async () => {
  useNoteStore.setState({
    byInstance: { a: { text: "baseline", fontSize: "base", updatedAt: 1 } },
  });
  await flushStorageWrites();
  await chrome.storage.local.set({
    "lux:widget:note": {
      version: 2,
      state: {
        byInstance: {
          a: { text: "remote", fontSize: "base", updatedAt: 100 },
          b: { text: "other note", fontSize: "lg", updatedAt: 100 },
        },
      },
    },
  });
  useNoteStore.getState().setText("a", "stale", 50);
  await flushStorageWrites();
  expect((await chrome.storage.local.get(null))["lux:widget:note"]).toMatchObject({
    state: { byInstance: { a: { text: "remote" }, b: { text: "other note" } } },
  });
});
