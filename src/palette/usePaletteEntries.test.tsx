// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePaletteEntries } from "@/palette/usePaletteEntries";
import { usePaletteStore } from "@/stores/usePaletteStore";

const ROOT = { kind: "root" } as const;

const shown = (query: string) =>
  renderHook(() => usePaletteEntries(ROOT, query)).result.current.groups.map((group) => ({
    label: group.label,
    items: group.entries.map((entry) => (entry.kind === "item" ? entry.item.label : "")),
    owners: group.entries.map((entry) => (entry.kind === "item" ? entry.item.meta : "")),
    ready: group.entries.map((entry) => entry.kind === "item" && entry.item.setup == null),
  }));

beforeEach(() => {
  usePaletteStore.setState({ usage: {}, suggestionsEnabled: true, suggestionCount: 7 });
});

describe("what the palette shows at rest", () => {
  it("leads the resting list with the system commands, which need no setting up", () => {
    const groups = shown("");
    expect(groups.map((group) => group.label)).toEqual(["Commands"]);

    const owners = groups[0]?.owners ?? [];
    const system = owners.filter((owner) => owner === "System").length;
    expect(system).toBeGreaterThan(0);
    expect(owners.slice(0, system).every((owner) => owner === "System")).toBe(true);
    expect((groups[0]?.ready ?? []).slice(0, system).every(Boolean)).toBe(true);
  });

  it("keeps each owner's commands together, alphabetically", () => {
    const owners = (shown("")[0]?.owners ?? []).filter((owner) => owner !== "System");
    expect(owners).toEqual([...owners].sort((a, b) => (a ?? "").localeCompare(b ?? "")));
  });

  it("leads with what you actually use, while leaving it in its own section too", () => {
    usePaletteStore.setState({ usage: { "action.toggleTheme": { count: 4, at: Date.now() } } });

    const groups = shown("");

    expect(groups[0]?.label).toBe("Suggestions");
    expect(groups[0]?.items).toEqual(["Toggle theme"]);
    expect(groups[1]?.items).toContain("Toggle theme");
  });

  it("leaves suggestions out once they are switched off", () => {
    usePaletteStore.setState({
      usage: { "action.toggleTheme": { count: 4, at: Date.now() } },
      suggestionsEnabled: false,
    });

    expect(shown("").map((group) => group.label)).not.toContain("Suggestions");
  });

  it("collapses everything into one group the moment you type", () => {
    const groups = shown("theme");

    expect(groups.map((group) => group.label)).toEqual(["Results"]);
  });
});
