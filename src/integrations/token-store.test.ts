import { describe, expect, it } from "vitest";
import {
  deleteAccount,
  getAccountByProvider,
  readAccountSummaries,
  writeAccount,
} from "@/integrations/token-store";
import type { IntegrationAccount } from "@/integrations/types";

function createAccount(): IntegrationAccount {
  const now = "2026-06-20T00:00:00.000Z";
  return {
    id: "google-123",
    providerId: "google",
    providerAccountId: "123",
    displayName: "Ada Lovelace",
    email: "ada@example.com",
    status: "connected",
    connectedAt: now,
    lastSyncedAt: now,
    token: {
      accessToken: "secret-token",
      expiresAt: Date.now() + 3_600_000,
      tokenType: "Bearer",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    },
  };
}

describe("token-store", () => {
  it("writes and reads an account by provider", async () => {
    const account = createAccount();
    await writeAccount(account);
    expect(await getAccountByProvider("google")).toEqual(account);
  });

  it("omits the token from account summaries", async () => {
    await writeAccount(createAccount());
    const [summary] = await readAccountSummaries();
    expect(summary).toBeDefined();
    expect(summary).not.toHaveProperty("token");
    expect(summary?.email).toBe("ada@example.com");
  });

  it("deletes an account", async () => {
    await writeAccount(createAccount());
    await deleteAccount("google-123");
    expect(await getAccountByProvider("google")).toBeNull();
  });

  it("returns null when no account exists for a provider", async () => {
    expect(await getAccountByProvider("google")).toBeNull();
  });
});
