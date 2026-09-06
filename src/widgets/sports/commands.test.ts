// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/sports/lib/espn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/espn")>()),
  fetchScoreboard: vi.fn(),
}));

import { fetchScoreboard } from "@/widgets/sports/lib/espn";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { sportsCommands } from "@/widgets/sports/commands";
import { DEFAULT_DATA, useSportsStore } from "@/widgets/sports/useSportsStore";

function place(...ids: string[]) {
  useDashboardStore.setState({ widgets: ids.map((id) => ({ id, type: "sports" as const })) });
}

async function run(id: string, query: string) {
  const command = sportsCommands().find((entry) => entry.id === id);
  if (command?.kind !== "provider") throw new Error(`expected a ${id} scope`);
  return command.search(query, new AbortController().signal);
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  localStorage.clear();
  place();
  useSportsStore.setState({ byInstance: {} });
});

describe("sportsCommands", () => {
  it("searches scores only in leagues that play matches, leaving a followed tour alone", async () => {
    place("sp1");
    useSportsStore.setState({
      byInstance: { sp1: { ...DEFAULT_DATA, following: { pga: { teams: [], tour: true } } } },
    });
    vi.mocked(fetchScoreboard).mockResolvedValue([]);

    await expect(run("sports.scores", "")).resolves.toEqual([]);

    const paths = vi.mocked(fetchScoreboard).mock.calls.map(([path]) => path);
    expect(paths).toEqual([expect.not.stringContaining("golf")]);
    expect(Object.keys(localStorage).filter((key) => key.includes("pga"))).toEqual([]);
  });
});
