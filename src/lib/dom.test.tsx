// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { isModalLayerOpen } from "@/lib/dom";

describe("isModalLayerOpen", () => {
  it("reports a modal Radix layer, which is what gates the global key layer", () => {
    expect(isModalLayerOpen()).toBe(false);

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(isModalLayerOpen()).toBe(true);
  });
});
