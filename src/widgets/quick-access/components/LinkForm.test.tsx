// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/widgets/quick-access/hooks/useHistorySuggestions", () => ({
  useHistorySuggestions: () => SUGGESTIONS,
}));

import { LinkForm } from "@/widgets/quick-access/components/LinkForm";
import { keyOf } from "@/widgets/quick-access/lib/url";

const SUGGESTIONS = [
  { id: "pinned", title: "Pinned site", url: "https://pinned.test/" },
  { id: "fresh", title: "Fresh site", url: "https://fresh.test/" },
];

describe("LinkForm suggestions", () => {
  it("announces the arrow-key cursor, skipping a suggestion that is already pinned", () => {
    render(
      <LinkForm
        pinnedUrls={new Set([keyOf("https://pinned.test/")])}
        onSubmit={() => "ok"}
        onCancel={() => undefined}
      />,
    );

    const input = screen.getByLabelText("Link URL");
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: /Fresh site/ }).id,
    );
  });
});
