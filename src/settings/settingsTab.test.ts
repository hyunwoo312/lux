// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SETTINGS_TABS } from "@/settings/tabsMeta";

const tabSchema = z.enum(SETTINGS_TABS).catch("general");

describe("persisted settings tab", () => {
  it("falls back instead of wiping when a stored tab no longer exists", () => {
    expect(tabSchema.parse("help")).toBe("general");
  });

  it("still keeps a tab that does exist", () => {
    expect(tabSchema.parse("accounts")).toBe("accounts");
  });
});
