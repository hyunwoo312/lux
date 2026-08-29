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

  it("runs a composed preprocess per value, not once over the whole record", () => {
    const schema = tolerantRecord(
      z.preprocess(
        (value) => (typeof value === "object" && value ? { ...value, n: 9 } : value),
        entry,
      ),
    );
    expect(schema.parse({ a: { id: "a", n: "bad" }, b: "junk" })).toEqual({ a: { id: "a", n: 9 } });
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

  it("warns about what was wrong and returns the current state when the blob cannot be read", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const current = { items: [{ id: "kept", n: 0 }] };

    expect(mergePersisted("test", schema, "not-an-object", current, (p) => p)).toBe(current);

    expect(String(warn.mock.calls[0]?.[0])).toMatch(/\(root\)/);
    warn.mockRestore();
  });

  it("says nothing when a store has simply never been written", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const current = { items: [{ id: "kept", n: 0 }] };

    expect(mergePersisted("test", schema, undefined, current, (p) => p)).toBe(current);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
