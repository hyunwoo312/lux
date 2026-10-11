// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useIntegrationStore } from "@/integrations";
import { readPolled, usePolledDefinition } from "@/widgets/core/usePolledResource";

const account = (id: string) => ({
  id,
  providerId: "github" as const,
  status: "connected" as const,
  providerAccountId: id,
  displayName: id,
  connectedAt: "2026-10-11T00:00:00Z",
});
const definition = (fetch: (signal: AbortSignal) => Promise<string>) => ({
  widget: "github" as const,
  account: "github" as const,
  cacheKey: "github:review",
  intervalMs: 60_000,
  parse: (value: unknown) => (typeof value === "string" ? value : null),
  fetch,
});

it("reads the replacement account's data instead of the previous account's fresh cache", async () => {
  const load = vi.fn().mockResolvedValueOnce("Alice").mockResolvedValueOnce("Bob");
  const resource = definition(load);
  useIntegrationStore.setState({ loaded: true, accounts: [account("Alice")] });
  expect(await readPolled(resource)).toBe("Alice");
  useIntegrationStore.setState({ accounts: [account("Bob")] });
  expect(await readPolled(resource)).toBe("Bob");
  expect(load).toHaveBeenCalledTimes(2);
});

it("discards a private response that finishes after the account changes", async () => {
  let complete!: (value: string) => void;
  const load = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        complete = resolve;
      }),
  );
  useIntegrationStore.setState({ loaded: true, accounts: [account("Alice")] });
  const pending = readPolled(definition(load));
  await waitFor(() => expect(load).toHaveBeenCalled());
  useIntegrationStore.setState({ accounts: [account("Bob")] });
  complete("Alice");
  await expect(pending).rejects.toThrow();
});

it("updates a mounted resource when the account changes without toggling connection status", async () => {
  const load = vi.fn().mockResolvedValueOnce("Alice").mockResolvedValueOnce("Bob");
  const resource = definition(load);
  useIntegrationStore.setState({ loaded: true, accounts: [account("Alice")] });
  const { result } = renderHook(() => usePolledDefinition(resource));
  await waitFor(() => expect(result.current.state).toEqual({ status: "success", data: "Alice" }));
  act(() => useIntegrationStore.setState({ accounts: [account("Bob")] }));
  await waitFor(() => expect(result.current.state).toEqual({ status: "success", data: "Bob" }));
});
