import { beforeEach, describe, expect, it, vi } from "vitest";

const integrationFetch = vi.fn();
vi.mock("@/integrations", () => ({
  integrationFetch: (...args: unknown[]) => integrationFetch(...args),
}));

const { fetchOutlookMail } = await import("@/widgets/email/lib/outlook");

const message = {
  id: "m1",
  subject: "Q3 planning",
  from: { emailAddress: { name: "Jane Cooper", address: "jane@example.com" } },
  receivedDateTime: "2026-08-27T10:00:00Z",
  isRead: false,
  bodyPreview: "The deck is ready",
  webLink: "https://outlook.office.com/x",
};

const NEXT = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$skip=37";

function page(next?: string) {
  return new Response(
    JSON.stringify({ value: [message], ...(next ? { "@odata.nextLink": next } : {}) }),
    { status: 200 },
  );
}

const url = (call: number) => String(integrationFetch.mock.calls[call]?.[1]);

beforeEach(() => integrationFetch.mockReset());

describe("requesting Outlook mail", () => {
  it("builds a url Graph will accept, with nothing left unencoded", async () => {
    integrationFetch.mockResolvedValue(page(NEXT));

    await fetchOutlookMail({ page: 1, query: "", size: 15 });

    expect(url(0)).not.toMatch(/[ "<>]/);
  });

  it("asks for the newest first on the plain inbox", async () => {
    integrationFetch.mockResolvedValue(page(NEXT));

    await fetchOutlookMail({ page: 1, query: "", size: 15 });

    expect(decodeURIComponent(url(0))).toContain("$orderby=receivedDateTime desc");
  });

  it("reads the sender's display name", async () => {
    integrationFetch.mockResolvedValue(page(undefined));

    const result = await fetchOutlookMail({ page: 1, query: "", size: 15 });

    expect(result.items[0]?.from).toBe("Jane Cooper");
    expect(result.hasNextPage).toBe(false);
  });
});

describe("paging Outlook", () => {
  it("follows the link Graph returns rather than computing a skip", async () => {
    integrationFetch.mockResolvedValueOnce(page(NEXT)).mockResolvedValueOnce(page(undefined));

    await fetchOutlookMail({ page: 1, query: "", size: 15 });
    await fetchOutlookMail({ page: 2, query: "", size: 15 });

    expect(url(1)).toBe(NEXT);
  });

  it("returns nothing for a page whose predecessor this tab never fetched", async () => {
    const result = await fetchOutlookMail({ page: 3, query: "unseen", size: 15 });

    expect(result).toEqual({ items: [], hasNextPage: false });
    expect(integrationFetch).not.toHaveBeenCalled();
  });

  it("asks for the batch size the widget was configured with", async () => {
    integrationFetch.mockResolvedValue(page(undefined));

    await fetchOutlookMail({ page: 1, query: "", size: 30 });

    expect(url(0)).toContain("$top=30");
  });
});

describe("searching", () => {
  it("sends a quoted search and asks for no ordering Graph would reject", async () => {
    integrationFetch.mockResolvedValue(page(undefined));

    await fetchOutlookMail({ page: 1, query: "planning deck", size: 15 });

    expect(decodeURIComponent(url(0))).toContain('$search="planning deck"');
    expect(url(0)).not.toContain("$orderby");
  });
});
