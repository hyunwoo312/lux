import { describe, expect, it } from "vitest";
import manifestRaw from "@/../public/manifest.json?raw";
import { SECTION_GATE } from "@/widgets/quick-access/lib/gates";

const optional = new Set(
  (JSON.parse(manifestRaw) as { optional_permissions: string[] }).optional_permissions,
);

describe("SECTION_GATE", () => {
  it("declares nothing beyond what the manifest offers optionally", () => {
    for (const gate of Object.values(SECTION_GATE)) {
      for (const permission of gate.permissions) expect(optional.has(permission)).toBe(true);
      expect(gate.permissions).toContain(gate.highlight);
    }
  });
});
