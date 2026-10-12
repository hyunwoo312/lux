// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { KeyboardLayoutControl } from "@/widgets/core/KeyboardLayoutControl";

it("keeps focus, announces changes and consumes the first Escape", () => {
  const onChange = vi.fn();
  const outerEscape = vi.fn();
  render(
    <div onKeyDown={outerEscape}>
      <KeyboardLayoutControl
        title="Note"
        item={{ i: "a", x: 0, y: 0, w: 6, h: 6 }}
        columns={12}
        onChange={onChange}
      />
    </div>,
  );
  const button = screen.getByRole("button", { name: "Move or resize Note" });
  button.focus();
  fireEvent.keyDown(button, { key: "ArrowRight" });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(button);
  fireEvent.keyDown(button, { key: "ArrowRight" });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ x: 1 }));
  expect(screen.getByRole("status")).toHaveTextContent("column 2, row 1");
  fireEvent.keyDown(button, { key: "ArrowDown", shiftKey: true });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ h: 7 }));
  expect(document.activeElement).toBe(button);
  outerEscape.mockClear();
  fireEvent.keyDown(button, { key: "Escape" });
  expect(outerEscape).not.toHaveBeenCalled();
  expect(button).toHaveAttribute("aria-pressed", "false");
  fireEvent.keyDown(button, { key: "Escape" });
  expect(outerEscape).toHaveBeenCalledOnce();
});
