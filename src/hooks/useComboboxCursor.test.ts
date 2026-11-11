// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useComboboxCursor } from "@/hooks/useComboboxCursor";

const arrowDown = {
  key: "ArrowDown",
  preventDefault: () => {},
} as ReactKeyboardEvent<HTMLInputElement>;

describe("the combobox cursor", () => {
  it("stays on the row the user moved to when more results arrive", () => {
    const { result, rerender } = renderHook(
      ({ items }) =>
        useComboboxCursor(items, { enabled: true, onPick: () => {}, itemKey: (item) => item }),
      { initialProps: { items: ["alpha", "beta", "gamma"] } },
    );
    act(() => result.current.onInputKeyDown(arrowDown));
    act(() => result.current.onInputKeyDown(arrowDown));

    rerender({ items: ["bookmark", "alpha", "beta", "gamma"] });

    expect(result.current.active).toBe(3);
  });

  it("starts at the top again when the chosen row is gone", () => {
    const { result, rerender } = renderHook(
      ({ items }) =>
        useComboboxCursor(items, { enabled: true, onPick: () => {}, itemKey: (item) => item }),
      { initialProps: { items: ["alpha", "beta"] } },
    );
    act(() => result.current.onInputKeyDown(arrowDown));

    rerender({ items: ["gamma", "delta"] });

    expect(result.current.active).toBe(0);
  });
});
