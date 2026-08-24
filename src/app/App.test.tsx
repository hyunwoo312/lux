// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { App } from "@/app/App";
import { useOnboardingStore } from "@/onboarding";

describe("App", () => {
  beforeEach(() => {
    useOnboardingStore.setState({ welcomeOpen: false });
  });

  it("renders the header controls", () => {
    render(<App />);
    const header = within(screen.getByRole("banner"));

    expect(header.getByRole("button", { name: "Add widget" })).toBeInTheDocument();
    expect(header.getByRole("button", { name: "Edit layout" })).toBeInTheDocument();
    expect(header.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(header.getByRole("button", { name: "Send feedback" })).toBeInTheDocument();
  });
});
