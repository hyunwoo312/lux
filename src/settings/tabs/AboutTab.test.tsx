// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AboutTab } from "@/settings/tabs/AboutTab";

function mockStarsResponse(count: number) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ stargazers_count: count }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AboutTab", () => {
  it("shows the star count once it loads", async () => {
    mockStarsResponse(1234);

    render(<AboutTab />);

    await waitFor(() => expect(screen.getByText("1.2k")).toBeInTheDocument());
  });

  it("reuses the cached count instead of refetching on every visit", async () => {
    const fetchMock = mockStarsResponse(42);

    const first = render(<AboutTab />);
    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    first.unmount();

    render(<AboutTab />);
    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
