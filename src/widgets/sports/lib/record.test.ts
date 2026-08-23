import { describe, expect, it } from "vitest";
import { readRecord } from "@/widgets/sports/lib/record";

describe("readRecord", () => {
  it("reads a soccer record as wins, draws and losses", () => {
    expect(readRecord("3-4-1", "soccer")).toEqual([
      { value: "3", label: "W" },
      { value: "4", label: "D" },
      { value: "1", label: "L" },
    ]);
  });

  it("reads the third number as overtime losses in hockey, not draws", () => {
    expect(readRecord("30-20-5", "hockey").map((part) => part.label)).toEqual(["W", "L", "OT"]);
  });

  it("reads a two-part record as wins and losses", () => {
    expect(readRecord("81-64", "baseball").map((part) => part.label)).toEqual(["W", "L"]);
  });

  it("gives up rather than guessing at a shape it does not know", () => {
    expect(readRecord("12-4-2-1", "soccer")).toEqual([]);
    expect(readRecord("3-4-1", "golf")).toEqual([]);
    expect(readRecord(undefined, "soccer")).toEqual([]);
  });

  it("refuses anything that is not a run of numbers", () => {
    expect(readRecord("1st in AL East", "baseball")).toEqual([]);
    expect(readRecord("3--1", "soccer")).toEqual([]);
  });
});
