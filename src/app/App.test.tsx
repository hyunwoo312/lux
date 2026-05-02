import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

describe("App", () => {
  it("renders the greeting heading and header controls", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add widget" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});
