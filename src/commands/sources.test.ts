// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { commandCatalogue, commandItems } from "@/commands/sources";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useIntegrationStore } from "@/integrations";
import { widgetPlugins } from "@/widgets/registry";
import type { IntegrationAccountSummary, IntegrationProviderId } from "@/integrations/types";

const PROVIDERS: IntegrationProviderId[] = ["google", "microsoft", "spotify", "github", "anilist"];

function account(providerId: IntegrationProviderId): IntegrationAccountSummary {
  return {
    id: `${providerId}-1`,
    providerId,
    providerAccountId: "42",
    displayName: "Someone",
    status: "connected",
    connectedAt: "2026-08-01T00:00:00.000Z",
  };
}

const catalogued = () => commandCatalogue().flatMap((group) => group.commands.map((c) => c.id));

beforeEach(() => {
  useDashboardStore.setState({
    widgets: widgetPlugins.map((plugin, index) => ({ id: `w${index}`, type: plugin.type })),
  });
  useIntegrationStore.setState({ accounts: PROVIDERS.map(account) });
});

describe("the command catalogue", () => {
  it("gives every command its own id", () => {
    const ids = catalogued();
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists every command the palette can offer, so each one can be switched off", () => {
    const known = new Set(catalogued());
    const offered = commandItems("")
      .filter((item) => item.section === "commands")
      .map((item) => item.id);

    expect(offered.filter((id) => !known.has(id))).toEqual([]);
  });
});
