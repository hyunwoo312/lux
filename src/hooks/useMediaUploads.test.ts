// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { useMediaUploads } from "@/hooks/useMediaUploads";
import type { MediaImageItem } from "@/lib/asset-store";

function file(name: string): File {
  return new File(["x"], name, { type: "image/png" });
}

describe("adding images", () => {
  it("keeps an earlier batch that is still saving when another is dropped", async () => {
    const saving: Array<() => void> = [];
    const { result } = renderHook(() => {
      const [items, setItems] = useState<MediaImageItem[]>([]);
      const uploads = useMediaUploads<MediaImageItem>({
        mode: "multi",
        single: null,
        items,
        maxItems: 10,
        poolLabel: "Image pool",
        validate: () => null,
        save: (dropped) =>
          new Promise((resolve) => {
            saving.push(() => resolve({ assetId: dropped.name } as MediaImageItem));
          }),
        remove: async () => {},
        setSingle: () => {},
        setItems,
      });
      return { items, uploads };
    });

    act(() => result.current.uploads.handleFiles([file("first")]));
    act(() => result.current.uploads.handleFiles([file("second")]));
    await act(async () => saving[1]?.());
    await act(async () => saving[0]?.());

    expect(result.current.items.map((item) => item.assetId).sort()).toEqual(["first", "second"]);
  });
});
