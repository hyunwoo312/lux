// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePaletteCommand } from "@/app/usePaletteCommand";
import { useCommandPaletteStore } from "@/palette";
import { useSettingsStore } from "@/settings";

type MessageListener = (
  message: unknown,
  sender: unknown,
  respond: (handled: boolean) => void,
) => unknown;

function chromeMock() {
  return globalThis.chrome as unknown as {
    runtime: { onMessage: { addListener: ReturnType<typeof vi.fn> } };
  };
}

function Host() {
  usePaletteCommand();
  return null;
}

async function mount(): Promise<MessageListener> {
  render(<Host />);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const listener = chromeMock().runtime.onMessage.addListener.mock.calls.at(-1)?.[0] as
    | MessageListener
    | undefined;
  if (!listener) throw new Error("usePaletteCommand registered no onMessage listener");
  return listener;
}

beforeEach(() => {
  vi.clearAllMocks();
  useCommandPaletteStore.setState({ open: false });
  useSettingsStore.setState({ open: false });
});

describe("palette command", () => {
  it("opens the palette when the command names this tab", async () => {
    const onMessage = await mount();
    const respond = vi.fn();

    onMessage({ type: "open-palette", activeTabId: 1 }, undefined, respond);

    expect(useCommandPaletteStore.getState().open).toBe(true);
    expect(respond).toHaveBeenCalledWith(true);
  });

  it("takes over from whatever dialog was open", async () => {
    useSettingsStore.setState({ open: true });
    const onMessage = await mount();

    onMessage({ type: "open-palette", activeTabId: 1 }, undefined, vi.fn());

    expect(useSettingsStore.getState().open).toBe(false);
    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it("ignores a command meant for another tab", async () => {
    const onMessage = await mount();
    const respond = vi.fn();

    onMessage({ type: "open-palette", activeTabId: 2 }, undefined, respond);

    expect(useCommandPaletteStore.getState().open).toBe(false);
    expect(respond).not.toHaveBeenCalled();
  });
});
