import { describe, expect, it } from "vitest";
import { continueList, toggleCheckbox } from "@/widgets/note/lib/lists";

const at = (text: string) => text.indexOf("|");
const strip = (text: string) => text.replace("|", "");
const run = (marked: string) => continueList(strip(marked), at(marked));

describe("continueList", () => {
  it("carries a dash bullet onto the next line", () => {
    expect(run("- milk|")).toEqual({ text: "- milk\n- ", caret: 9 });
  });

  it("carries the other bullet markers too", () => {
    expect(run("* milk|")?.text).toBe("* milk\n* ");
    expect(run("+ milk|")?.text).toBe("+ milk\n+ ");
  });

  it("increments a numbered list", () => {
    expect(run("3. third|")?.text).toBe("3. third\n4. ");
  });

  it("keeps the separator a numbered list was written with", () => {
    expect(run("1) first|")?.text).toBe("1) first\n2) ");
  });

  it("carries an unchecked box, never a checked one", () => {
    expect(run("- [ ] buy milk|")?.text).toBe("- [ ] buy milk\n- [ ] ");
    expect(run("- [x] bought milk|")?.text).toBe("- [x] bought milk\n- [ ] ");
  });

  it("preserves indentation", () => {
    expect(run("  - nested|")?.text).toBe("  - nested\n  - ");
  });

  it("clears an empty marker instead of adding another", () => {
    expect(run("- one\n- |")).toEqual({ text: "- one\n", caret: 6 });
    expect(run("- [ ] |")).toEqual({ text: "", caret: 0 });
  });

  it("splits the line when the caret sits before the item's text", () => {
    expect(run("- |milk")).toEqual({ text: "- \n- milk", caret: 5 });
  });

  it("leaves ordinary prose alone", () => {
    expect(run("just a thought|")).toBeNull();
  });

  it("leaves a line that merely starts with a dash-word alone", () => {
    expect(run("-notalist|")).toBeNull();
  });

  it("continues from the middle of a document", () => {
    expect(run("intro\n- one|\ntail")?.text).toBe("intro\n- one\n- \ntail");
  });
});

describe("toggleCheckbox", () => {
  it("checks an unchecked box", () => {
    expect(toggleCheckbox("- [ ] buy milk", 8)).toEqual({ text: "- [x] buy milk", caret: 8 });
  });

  it("unchecks a checked box", () => {
    expect(toggleCheckbox("- [x] buy milk", 8)?.text).toBe("- [ ] buy milk");
  });

  it("treats an upper-case X as checked", () => {
    expect(toggleCheckbox("- [X] buy milk", 8)?.text).toBe("- [ ] buy milk");
  });

  it("finds the box on the caret's own line, not the first line", () => {
    const text = "- [ ] one\n- [ ] two";
    expect(toggleCheckbox(text, 14)?.text).toBe("- [ ] one\n- [x] two");
  });

  it("does nothing on a line without a box", () => {
    expect(toggleCheckbox("- plain bullet", 5)).toBeNull();
    expect(toggleCheckbox("prose", 2)).toBeNull();
  });
});
