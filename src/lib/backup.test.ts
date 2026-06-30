import { describe, expect, it } from "vitest";
import { importSettings } from "@/lib/backup";

function makeFile(value: unknown): File {
  return new File([JSON.stringify(value)], "backup.json", { type: "application/json" });
}

describe("importSettings", () => {
  it("rejects a backup created by a newer version of Lux", async () => {
    const file = makeFile({
      marker: "lux-settings-backup",
      version: 99,
      chromeLocal: {},
      local: {},
    });
    await expect(importSettings(file)).rejects.toThrow(/newer version/i);
  });

  it("rejects a file that is not a Lux settings backup", async () => {
    const file = makeFile({ hello: "world" });
    await expect(importSettings(file)).rejects.toThrow(/valid Lux settings file/i);
  });
});
