// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { accentCommand } from "@/commands/accent";
import { useAccentStore } from "@/stores/useAccentStore";
import { ACCENT_PRESETS } from "@/widgets/core/accent";

const results = (query: string) => {
  if (accentCommand.effect !== "scope") throw new Error("accent command must open a scope");
  return accentCommand.search(query, new AbortController().signal);
};

beforeEach(() => {
  useAccentStore.setState({ accent: "violet" });
});

describe("set accent colour", () => {
  it("offers every preset and tags the one in use", async () => {
    const found = await results("");

    expect(found).toHaveLength(ACCENT_PRESETS.length);
    expect(found.filter((result) => result.meta === "Active")).toMatchObject([{ label: "Violet" }]);
  });

  it("applies the accent that was picked", async () => {
    const [teal] = await results("teal");
    await teal?.run();

    expect(useAccentStore.getState().accent).toBe("teal");
  });
});
