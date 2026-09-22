// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIntegrationStore } from "@/integrations";
import { AccountsTab } from "@/settings/tabs/AccountsTab";

describe("unreadable saved accounts", () => {
  it("says nothing is being overwritten and starts fresh on request", async () => {
    useIntegrationStore.setState({ accounts: [], unreadable: true, loaded: true });
    render(<AccountsTab />);

    expect(
      screen.getByText(
        "Your connected accounts could not be read, so nothing is being overwritten.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));

    await waitFor(() => expect(useIntegrationStore.getState().unreadable).toBe(false));
  });
});
