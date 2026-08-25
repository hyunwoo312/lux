// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Welcome } from "@/onboarding/Welcome";
import { useOnboardingStore } from "@/onboarding/useOnboardingStore";
import { useGuideStore } from "@/guide";
import { WELCOME_SEEN_KEY } from "@/lib/local-store";

function renderWelcome() {
  return render(
    <TooltipProvider>
      <Welcome />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useOnboardingStore.setState({ welcomeOpen: true });
  useGuideStore.setState({ open: false });
});

describe("the first-run welcome", () => {
  it("puts its three points and both ways out on screen", () => {
    renderWelcome();

    expect(screen.getByRole("heading", { name: "Welcome to Lux" })).toBeInTheDocument();
    for (const point of ["Make it yours", "Light or dark", "Connect your accounts"]) {
      expect(screen.getByText(point)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open the guide" })).toBeInTheDocument();
  });

  it("does not promise that every account connects the same way", () => {
    renderWelcome();

    expect(screen.getByText(/Spotify needs a few more/)).toBeInTheDocument();
  });

  it("remembers being skipped so it does not return", () => {
    renderWelcome();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(useOnboardingStore.getState().welcomeOpen).toBe(false);
    expect(localStorage.getItem(WELCOME_SEEN_KEY)).toBe("1");
  });

  it("hands over to the guide when that is what was asked for", () => {
    renderWelcome();

    fireEvent.click(screen.getByRole("button", { name: "Open the guide" }));

    expect(useOnboardingStore.getState().welcomeOpen).toBe(false);
    expect(useGuideStore.getState().open).toBe(true);
  });

  it("comes back after a settings reset", () => {
    renderWelcome();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    useOnboardingStore.getState().replayOnNextOpen();

    expect(localStorage.getItem(WELCOME_SEEN_KEY)).toBeNull();
  });
});
