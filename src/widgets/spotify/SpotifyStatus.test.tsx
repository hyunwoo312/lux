import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { SpotifyStatus } from "@/widgets/spotify/SpotifyStatus";
import type { IntegrationAccountStatus } from "@/integrations/types";

function setAccount(status: IntegrationAccountStatus | null) {
  useIntegrationStore.setState({
    accounts: status
      ? [
          {
            id: "spotify-1",
            providerId: "spotify",
            providerAccountId: "1",
            displayName: "Ada",
            status,
            connectedAt: "2026-06-20T00:00:00.000Z",
          },
        ]
      : [],
    loaded: true,
  });
}

function renderStatus() {
  return render(
    <TooltipProvider>
      <SpotifyStatus />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  setAccount(null);
});

describe("SpotifyStatus", () => {
  it("renders the search control when the account is connected", () => {
    setAccount("connected");
    renderStatus();
    expect(screen.getByRole("button", { name: "Search Spotify" })).toBeInTheDocument();
  });

  it("shows a non-interactive marker when the account is not connected", () => {
    setAccount("needsReconnect");
    renderStatus();
    expect(screen.queryByRole("button", { name: "Search Spotify" })).toBeNull();
    expect(screen.getByLabelText("Spotify not connected")).toBeInTheDocument();
  });
});
