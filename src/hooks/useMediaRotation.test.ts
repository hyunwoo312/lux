// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMediaRotation } from "@/hooks/useMediaRotation";

function renderRotation(assetIds: string[], setCurrentIndex: (index: number) => void) {
  return renderHook(
    ({ assetIds }) =>
      useMediaRotation({
        assetIds,
        queueKey: "test.newtab-queue",
        order: "sequential",
        rotateOnNewtab: true,
        rotateTimed: false,
        intervalSeconds: 30,
        currentIndex: 0,
        setCurrentIndex,
        advance: () => undefined,
      }),
    { initialProps: { assetIds } },
  );
}

describe("useMediaRotation", () => {
  it("does not re-roll when the pool is unchanged", () => {
    const setCurrentIndex = vi.fn();
    const { rerender } = renderRotation(["a", "b", "c"], setCurrentIndex);
    expect(setCurrentIndex).toHaveBeenCalledTimes(1);

    rerender({ assetIds: ["a", "b", "c"] });
    expect(setCurrentIndex).toHaveBeenCalledTimes(1);
  });

  it("re-rolls when the pool changes", () => {
    const setCurrentIndex = vi.fn();
    const { rerender } = renderRotation(["a", "b"], setCurrentIndex);

    rerender({ assetIds: ["a", "b", "c"] });
    expect(setCurrentIndex).toHaveBeenCalledTimes(2);
  });
});
