// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotePreview } from "@/widgets/note/components/NotePreview";

describe("note reading preview", () => {
  it("renders supported headings, emphasis, lists, quotes and code", () => {
    const { container } = render(
      <NotePreview
        text={
          "# Plan\n\n**Bold** and *quiet* with `code`\n\n- [ ] Open\n- [x] Done\n\n3. Third\n\n> Remember\n\n```js\nconst x = 1;\n```"
        }
      />,
    );
    expect(screen.getByRole("heading", { name: "Plan", level: 1 })).toBeInTheDocument();
    expect(container.querySelector("strong")).toHaveTextContent("Bold");
    expect(container.querySelector("em")).toHaveTextContent("quiet");
    expect(screen.getByRole("img", { name: "Checked" })).toBeInTheDocument();
    expect(container.querySelector("ol")).toHaveAttribute("start", "3");
    expect(container.querySelector("blockquote")).toHaveTextContent("Remember");
    expect(container.querySelector("pre")).toHaveTextContent("const x = 1;");
  });
  it("keeps HTML, images, unsafe links and unsupported syntax inert", () => {
    const text =
      "<script>alert(1)</script>\n![remote](https://example.com/pixel)\n[unsafe](javascript:alert)\n| table |\n```unclosed";
    const { container } = render(<NotePreview text={text} />);
    expect(container.querySelector("script,img,iframe,a")).toBeNull();
    expect(screen.getByRole("article")).toHaveTextContent("<script>alert(1)</script>");
    expect(screen.getByRole("article")).toHaveTextContent("```unclosed");
  });
  it("allows only explicit web links with an isolated new tab", () => {
    render(<NotePreview text="[Docs](https://example.com/docs)" />);
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });
  it("offers a quiet empty state", () => {
    render(<NotePreview text="  " />);
    expect(screen.getByText(/Nothing to read/)).toBeInTheDocument();
  });
});
