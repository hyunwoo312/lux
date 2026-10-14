import { describe, expect, it } from "vitest";
import { formatNote } from "@/widgets/note/lib/format";

describe("note formatting", () => {
  it("wraps and unwraps a selection without changing surrounding text", () => {
    const edit = formatNote("hello world", 6, 11, "bold");
    expect(edit).toEqual({ text: "hello **world**", start: 8, end: 13 });
    expect(formatNote(edit.text, edit.start, edit.end, "bold")).toEqual({
      text: "hello world",
      start: 6,
      end: 11,
    });
  });
  it("selects a placeholder when formatting a caret", () => {
    expect(formatNote("", 0, 0, "italic")).toEqual({ text: "*text*", start: 1, end: 5 });
  });
  it("formats exactly the selected lines, excluding a trailing newline", () => {
    expect(formatNote("one\ntwo\nthree", 0, 8, "bullet").text).toBe("- one\n- two\nthree");
    expect(formatNote("one\ntwo", 5, 5, "heading").text).toBe("one\n## two");
  });
  it("adds checklist markers and removes a matching line style", () => {
    const edit = formatNote("one\ntwo", 0, 7, "task");
    expect(edit.text).toBe("- [ ] one\n- [ ] two");
    expect(formatNote(edit.text, edit.start, edit.end, "task").text).toBe("one\ntwo");
  });
  it("numbers selected lines and selects the destination of a new link", () => {
    const numbered = formatNote("one\ntwo", 0, 7, "number");
    expect(numbered.text).toBe("1. one\n2. two");
    expect(formatNote(numbered.text, numbered.start, numbered.end, "number").text).toBe("one\ntwo");
    const link = formatNote("site", 0, 4, "link");
    expect(link.text.slice(link.start, link.end)).toBe("https://");
  });
  it("formats multiline inline selections as individually readable lines", () => {
    const edit = formatNote("one\n\ntwo", 0, 8, "bold");
    expect(edit.text).toBe("**one**\n\n**two**");
    expect(formatNote(edit.text, edit.start, edit.end, "bold").text).toBe("one\n\ntwo");
  });
});
