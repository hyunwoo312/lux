// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "@/app/App";
import { useOnboardingStore } from "@/onboarding";
import { useDashboardStore } from "@/stores/useDashboardStore";

describe("App", () => {
  beforeEach(() => {
    useOnboardingStore.setState({ welcomeOpen: false });
  });

  it("lays the page out as a banner over one scroll region", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("holds the board back until the saved layout is in hand", async () => {
    render(<App />);
    const board = screen.getByRole("main").parentElement;

    expect(board).toHaveStyle({ opacity: "0" });

    await waitFor(() => expect(useDashboardStore.persist.hasHydrated()).toBe(true));
    await waitFor(() => expect(board).not.toHaveStyle({ opacity: "0" }));
  });
});
