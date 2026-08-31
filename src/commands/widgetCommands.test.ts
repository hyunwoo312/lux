// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { availableWidgetCommands } from "@/commands/widgetCommands";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
import type { IntegrationAccountSummary } from "@/integrations/types";

function spotifyAccount(status: IntegrationAccountSummary["status"]): IntegrationAccountSummary {
  return {
    id: "spotify-1",
    providerId: "spotify",
    providerAccountId: "user-1",
    displayName: "Someone",
    status,
    connectedAt: "2026-08-01T00:00:00.000Z",
  };
}

const spotifyCommands = () =>
  availableWidgetCommands().filter((command) => command.id.startsWith("spotify."));

beforeEach(() => {
  useDashboardStore.setState({ widgets: [] });
  useIntegrationStore.setState({ accounts: [] });
});

const setupReasons = () => [
  ...new Set(spotifyCommands().map((command) => command.setupNeeded?.reason ?? null)),
];

describe("availableWidgetCommands", () => {
  it("always lists a widget's commands, so they stay discoverable", () => {
    expect(spotifyCommands().length).toBeGreaterThan(0);
  });

  it("tells you what a command still needs before it can run", () => {
    expect(setupReasons()).toEqual(["Connect Spotify"]);
  });

  it("clears the requirement once the account is connected", () => {
    useIntegrationStore.setState({ accounts: [spotifyAccount("connected")] });
    expect(setupReasons()).toEqual([null]);
  });

  it("asks again when the account needs reconnecting", () => {
    useIntegrationStore.setState({ accounts: [spotifyAccount("needsReconnect")] });
    expect(setupReasons()).toEqual(["Connect Spotify"]);
  });
});
