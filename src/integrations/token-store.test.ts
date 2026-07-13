import { describe, expect, it } from "vitest";
import {
  deleteAccount,
  getAccountByProvider,
  readAccountSummaries,
  replaceProviderAccount,
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

  it("drops a stale same-provider account when connecting a different one", async () => {
    const stale: IntegrationAccount = {
      ...createAccount(),
      id: "google-old",
      providerAccountId: "old",
      status: "needsReconnect",
      token: undefined,
    };
    await writeAccount(stale);

    const fresh = createAccount();
    await replaceProviderAccount(fresh);

    const google = (await readAccountSummaries()).filter((s) => s.providerId === "google");
    expect(google).toHaveLength(1);
    expect(google[0]?.id).toBe(fresh.id);
    expect(await getAccountByProvider("google")).toEqual(fresh);
  });

  it("coerces an invalid avatar URL to undefined instead of dropping the account", async () => {
    await writeAccount({ ...createAccount(), avatarUrl: "not-a-url" });
    const account = await getAccountByProvider("google");
    expect(account?.displayName).toBe("Ada Lovelace");
    expect(account?.avatarUrl).toBeUndefined();
  });

  it("propagates a storage write failure instead of swallowing it", async () => {
    const chromeRef = (globalThis as unknown as { chrome: typeof chrome }).chrome;
    chromeRef.storage.local.set = (async () => {
      throw new Error("QUOTA_BYTES quota exceeded");
    }) as typeof chrome.storage.local.set;

    await expect(writeAccount(createAccount())).rejects.toThrow("QUOTA_BYTES");
  });
});
