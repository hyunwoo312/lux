import { describe, expect, it } from "vitest";
import { visibleItems } from "@/widgets/github/lib/visibility";

const items = [
  { id: "pub", isPrivate: false },
  { id: "priv", isPrivate: true },
];

describe("visibleItems", () => {
  it("keeps everything when private repositories are shown", () => {
    expect(visibleItems(items, true)).toHaveLength(2);
  });

  it("drops the private ones when they are hidden", () => {
    expect(visibleItems(items, false)).toEqual([{ id: "pub", isPrivate: false }]);
  });

  it("hands back the same array when nothing needs filtering, so memos stay stable", () => {
    expect(visibleItems(items, true)).toBe(items);
  });
});
