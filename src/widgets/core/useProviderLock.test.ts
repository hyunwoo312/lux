// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIntegrationStore } from "@/integrations";
import { getWidgetPlugin } from "@/widgets/registry";
import { useProviderLock } from "@/widgets/core/useProviderLock";

function signIn(status: "connected" | "needsReconnect") {
  useIntegrationStore.setState({
    accounts: [
      {
        id: "spotify-1",
        providerId: "spotify",
        providerAccountId: "1",
        displayName: "Ada",
        status,
        connectedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
    loaded: true,
  });
}

beforeEach(() => {
  useIntegrationStore.setState({ accounts: [], loaded: true });
});

describe("useProviderLock", () => {
  it("locks a widget that needs an account until one is connected", () => {
    const { result, rerender } = renderHook(() => useProviderLock(getWidgetPlugin("spotify")));
    expect(result.current?.message).toBe("Connect Spotify to see what is playing.");
    expect(result.current?.actionLabel).toBe("Connect");

    signIn("needsReconnect");
    rerender();
    expect(result.current?.actionLabel).toBe("Reconnect");

    signIn("connected");
    rerender();
    expect(result.current).toBeNull();
  });

  it("never locks a widget that degrades without an account", () => {
    const { result } = renderHook(() => useProviderLock(getWidgetPlugin("anilist")));
    expect(result.current).toBeNull();
  });
});
