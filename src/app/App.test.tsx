import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";
import { useOnboardingStore } from "@/onboarding";

describe("App", () => {
  beforeEach(() => {
    useOnboardingStore.setState({ welcomeOpen: false, tourActive: false });
  });

  it("renders the header controls", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Add widget" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});
