const BULLET = /^(\s*)([-*+])\s+(\[[ xX]\]\s+)?(.*)$/;
const NUMBERED = /^(\s*)(\d+)([.)])\s+(.*)$/;

export type ListEdit = { text: string; caret: number };

function lineStart(text: string, caret: number): number {
  return text.lastIndexOf("\n", caret - 1) + 1;
}

function lineEnd(text: string, caret: number): number {
  const index = text.indexOf("\n", caret);
  return index === -1 ? text.length : index;
}

function insert(text: string, caret: number, addition: string): ListEdit {
  return {
    text: text.slice(0, caret) + addition + text.slice(caret),
    caret: caret + addition.length,
  };
}

export function continueList(text: string, caret: number): ListEdit | null {
  const start = lineStart(text, caret);
  const line = text.slice(start, caret);
  const isLineDone = text.slice(caret, lineEnd(text, caret)).trim() === "";

  const bullet = BULLET.exec(line);
  if (bullet) {
    const [, indent = "", marker = "-", checkbox, body = ""] = bullet;
    if (body.trim() === "" && isLineDone)
      return { text: text.slice(0, start) + text.slice(caret), caret: start };
    return insert(text, caret, `\n${indent}${marker} ${checkbox ? "[ ] " : ""}`);
  }

  const numbered = NUMBERED.exec(line);
  if (numbered) {
    const [, indent = "", value = "1", separator = ".", body = ""] = numbered;
    if (body.trim() === "" && isLineDone)
      return { text: text.slice(0, start) + text.slice(caret), caret: start };
    return insert(text, caret, `\n${indent}${Number(value) + 1}${separator} `);
  }

  return null;
}

export function toggleCheckbox(text: string, caret: number): ListEdit | null {
  const start = lineStart(text, caret);
  const end = lineEnd(text, caret);
  const match = /^(\s*[-*+]\s+\[)([ xX])(\].*)$/.exec(text.slice(start, end));
  if (!match) return null;
  const [, head = "", state = " ", tail = ""] = match;
  return {
    text: text.slice(0, start) + head + (state === " " ? "x" : " ") + tail + text.slice(end),
    caret,
  };
}
