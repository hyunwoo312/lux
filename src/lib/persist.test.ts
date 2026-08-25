import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";

const entry = z.object({ id: z.string(), n: z.number() });

describe("tolerantArray", () => {
  it("keeps the readable entries and drops the rest", () => {
    const schema = tolerantArray(entry);
    expect(schema.parse([{ id: "a", n: 1 }, "junk", { id: "b" }])).toEqual([{ id: "a", n: 1 }]);
  });

  it("reads a missing or non-array value as empty rather than failing its parent", () => {
    const parent = z.object({ items: tolerantArray(entry) });
    expect(parent.parse({}).items).toEqual([]);
    expect(parent.parse({ items: "nope" }).items).toEqual([]);
  });
});

describe("tolerantRecord", () => {
  it("keeps the readable values and drops the rest", () => {
    const schema = tolerantRecord(entry);
    expect(schema.parse({ a: { id: "a", n: 1 }, b: "junk" })).toEqual({ a: { id: "a", n: 1 } });
  });

  it("normalises each value before parsing it", () => {
    const schema = tolerantRecord(entry, (value) =>
      typeof value === "object" && value ? { ...value, n: 9 } : value,
    );
    expect(schema.parse({ a: { id: "a", n: "bad" } })).toEqual({ a: { id: "a", n: 9 } });
  });

  it("reads a missing or non-object value as empty", () => {
    const parent = z.object({ byId: tolerantRecord(entry) });
    expect(parent.parse({}).byId).toEqual({});
    expect(parent.parse({ byId: [] }).byId).toEqual({});
  });
});

describe("mergePersisted", () => {
  const schema = z.object({ items: tolerantArray(entry) });

  it("builds the next state from the parsed blob", () => {
    const next = mergePersisted(
      "test",
      schema,
      { items: [{ id: "a", n: 1 }] },
      { items: [] },
      (p) => p,
    );
    expect(next.items).toHaveLength(1);
  });

  it("warns and returns the current state when the blob cannot be read at all", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const current = { items: [{ id: "kept", n: 0 }] };
    expect(mergePersisted("test", schema, "not-an-object", current, (p) => p)).toBe(current);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("says nothing when a store has simply never been written", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const current = { items: [{ id: "kept", n: 0 }] };

    expect(mergePersisted("test", schema, undefined, current, (p) => p)).toBe(current);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("names what was wrong instead of printing an opaque object", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    mergePersisted("test", schema, "not-an-object", { items: [] }, (p) => p);

    expect(String(warn.mock.calls[0]?.[0])).toMatch(/\(root\)/);
    warn.mockRestore();
  });
});
