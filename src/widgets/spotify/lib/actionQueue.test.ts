import { describe, expect, it } from "vitest";
import { createLatestOnly, createSerialQueue } from "@/widgets/spotify/lib/actionQueue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("createSerialQueue", () => {
  it("runs every press, so two taps on next skip two tracks", async () => {
    const queue = createSerialQueue();
    const ran: number[] = [];
    const first = deferred();

    queue(async () => {
      ran.push(1);
      await first.promise;
    });
    queue(async () => {
      ran.push(2);
    });

    await Promise.resolve();
    expect(ran).toEqual([1]);
    first.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ran).toEqual([1, 2]);
  });

  it("keeps them in order rather than racing", async () => {
    const queue = createSerialQueue();
    const ran: number[] = [];

    for (const index of [1, 2, 3]) {
      queue(async () => {
        await Promise.resolve();
        ran.push(index);
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ran).toEqual([1, 2, 3]);
  });

  it("carries on after one press fails", async () => {
    const queue = createSerialQueue();
    const ran: number[] = [];

    queue(async () => {
      ran.push(1);
      throw new Error("nope");
    });
    queue(async () => {
      ran.push(2);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ran).toEqual([1, 2]);
  });
});

describe("createLatestOnly", () => {
  it("collapses a flurry of toggles to the last one asked for", async () => {
    const latest = createLatestOnly();
    const ran: string[] = [];
    const first = deferred();

    latest(async () => {
      ran.push("on");
      await first.promise;
    });
    latest(async () => {
      ran.push("off");
    });
    latest(async () => {
      ran.push("on-again");
    });

    await Promise.resolve();
    expect(ran).toEqual(["on"]);
    first.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ran).toEqual(["on", "on-again"]);
  });
});
