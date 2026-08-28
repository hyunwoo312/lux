// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { App } from "@/app/App";
import { useOnboardingStore } from "@/onboarding";
import { TOOLBAR_ICON_COUNT } from "@/guide/toolbarLayout";

describe("toolbarLayout", () => {
  it("mirrors the real toolbar's control count, so the guide cannot drift from it", () => {
    useOnboardingStore.setState({ welcomeOpen: false });
    render(<App />);
    const toolbar = within(screen.getByRole("banner")).getAllByRole("button");

    expect(toolbar).toHaveLength(TOOLBAR_ICON_COUNT);
  });
});
