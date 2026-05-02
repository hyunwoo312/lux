import { z } from "zod";
import { read, remove, write } from "@/lib/storage";

const schema = z.object({ count: z.number() });
const fallback = { count: 0 };

describe("storage", () => {
  it("returns the fallback when nothing is stored", async () => {
    expect(await read("missing", schema, fallback)).toEqual(fallback);
  });

  it("round-trips a valid value", async () => {
    await write("counter", { count: 3 });
    expect(await read("counter", schema, fallback)).toEqual({ count: 3 });
  });

  it("rejects schema-invalid data and returns the fallback", async () => {
    await write("counter", { count: "not-a-number" });
    expect(await read("counter", schema, fallback)).toEqual(fallback);
  });

  it("removes a stored value", async () => {
    await write("counter", { count: 9 });
    await remove("counter");
    expect(await read("counter", schema, fallback)).toEqual(fallback);
  });
});
