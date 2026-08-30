// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPolledResources,
  peekFreshness,
  readPolled,
  usePolledDefinition,
  type PolledDefinition,
} from "@/widgets/core/usePolledResource";
import { act, renderHook, waitFor } from "@testing-library/react";

type Payload = { value: string };

let fetches = 0;
let resolveFetch: (data: Payload) => void = () => undefined;

const definition: PolledDefinition<Payload> = {
  cacheKey: "test:shared",
  intervalMs: 60_000,
  parse: (raw) =>
    typeof raw === "object" && raw !== null && "value" in raw ? (raw as Payload) : null,
  fetch: () => {
    fetches += 1;
    return new Promise<Payload>((resolve) => {
      resolveFetch = resolve;
    });
  },
};

beforeEach(() => {
  clearPolledResources();
  localStorage.clear();
  fetches = 0;
});

describe("a resource shared by the widget and command surfaces", () => {
  it("serves both from one request rather than fetching twice", async () => {
    const widget = renderHook(() => usePolledDefinition(definition));
    await waitFor(() => expect(fetches).toBe(1));

    const command = readPolled(definition);
    await act(async () => resolveFetch({ value: "once" }));

    await expect(command).resolves.toEqual({ value: "once" });
    expect(fetches).toBe(1);
    await waitFor(() =>
      expect(widget.result.current.state).toEqual({ status: "success", data: { value: "once" } }),
    );
  });

  it("pushes what the command fetched into an already-mounted widget", async () => {
    const command = readPolled(definition);
    await waitFor(() => expect(fetches).toBe(1));

    const widget = renderHook(() => usePolledDefinition(definition));
    await act(async () => resolveFetch({ value: "from the palette" }));
    await command;

    expect(fetches).toBe(1);
    await waitFor(() =>
      expect(widget.result.current.state).toEqual({
        status: "success",
        data: { value: "from the palette" },
      }),
    );
  });
});

describe("what a command read leaves behind", () => {
  it("does not report a widget as failing when only a command's read failed", async () => {
    const failing: PolledDefinition<Payload> = {
      ...definition,
      cacheKey: "test:failing",
      fetch: () => {
        fetches += 1;
        return fetches === 1
          ? Promise.resolve({ value: "cached" })
          : Promise.reject(new Error("rate limited"));
      },
    };

    await expect(readPolled(failing)).resolves.toEqual({ value: "cached" });

    const later = Date.now() + 10 * 60_000;
    vi.spyOn(Date, "now").mockReturnValue(later);
    await expect(readPolled(failing)).resolves.toEqual({ value: "cached" });
    vi.mocked(Date.now).mockRestore();

    expect(fetches).toBe(2);
    expect(peekFreshness("test:failing")).toEqual({ status: "current" });
  });

  it("hands a later widget the data the command already fetched, without fetching again", async () => {
    const command = readPolled(definition);
    await waitFor(() => expect(fetches).toBe(1));
    resolveFetch({ value: "from the palette" });
    await command;

    const widget = renderHook(() => usePolledDefinition(definition));

    await waitFor(() =>
      expect(widget.result.current.state).toEqual({
        status: "success",
        data: { value: "from the palette" },
      }),
    );
    expect(fetches).toBe(1);
  });
});

describe("a refresh in another tab", () => {
  it("reaches a mounted widget instead of making it fetch again", async () => {
    const widget = renderHook(() => usePolledDefinition(definition));
    await waitFor(() => expect(fetches).toBe(1));
    await act(async () => resolveFetch({ value: "first" }));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `lux:polled:${definition.cacheKey}`,
          newValue: JSON.stringify({ data: { value: "from another tab" }, at: Date.now() + 1000 }),
        }),
      );
    });

    await waitFor(() =>
      expect(widget.result.current.state).toEqual({
        status: "success",
        data: { value: "from another tab" },
      }),
    );
    expect(fetches).toBe(1);
  });
});
