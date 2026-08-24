// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InlineText } from "@/guide/components/InlineText";

describe("InlineText", () => {
  it("renders bold without leaking the asterisks", () => {
    render(<InlineText text="Press the **Connect** button" />);

    expect(screen.getByText("Connect").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("renders backticks as key chips", () => {
    render(<InlineText text="Hit `Esc` to leave" />);

    expect(screen.getByText("Esc").tagName).toBe("KBD");
  });

  it("renders italics", () => {
    render(<InlineText text="when you are *not* editing" />);

    expect(screen.getByText("not").tagName).toBe("EM");
  });
});
