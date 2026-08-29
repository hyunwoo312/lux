import { beforeEach, describe, expect, it, vi } from "vitest";

const integrationFetch = vi.fn();
vi.mock("@/integrations", () => ({
  integrationFetch: (...args: unknown[]) => integrationFetch(...args),
  useIntegrationStore: { getState: () => ({ accounts: [] }) },
  accountFor: (accounts: { providerId: string }[], providerId: string) =>
    accounts.find((account) => account.providerId === providerId),
}));

const { fetchGmail } = await import("@/widgets/email/lib/gmail");

const list = { messages: [{ id: "m1" }], nextPageToken: "page-2-token" };
const detail = {
  id: "m1",
  threadId: "t1",
  labelIds: ["INBOX", "UNREAD"],
  payload: {
    headers: [
      { name: "From", value: "Ana Ruiz <ana@example.com>" },
      { name: "Subject", value: "Friday review" },
      { name: "Date", value: "Wed, 27 Aug 2026 10:00:00 -0500" },
    ],
  },
};

function respondWithOneMessage() {
  integrationFetch
    .mockResolvedValueOnce(new Response(JSON.stringify(list), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }));
}

beforeEach(() => integrationFetch.mockReset());

describe("reading Gmail", () => {
  it("fetches on the first page the paged resource asks for, which is 1 and not 0", async () => {
    respondWithOneMessage();

    const page = await fetchGmail({ page: 1, query: "", size: 15 });

    expect(page.items).toHaveLength(1);
    expect(String(integrationFetch.mock.calls[0]?.[1])).not.toContain("pageToken");
  });

  it("reads the sender's display name out of the From header", async () => {
    respondWithOneMessage();

    const page = await fetchGmail({ page: 1, query: "", size: 15 });

    expect(page.items[0]?.from).toBe("Ana Ruiz");
    expect(page.items[0]?.unread).toBe(true);
  });

  it("returns nothing for a page whose predecessor this tab never fetched", async () => {
    const page = await fetchGmail({ page: 4, query: "unseen", size: 15 });

    expect(page).toEqual({ items: [], hasNextPage: false });
    expect(integrationFetch).not.toHaveBeenCalled();
  });

  it("asks for the batch size the widget was configured with", async () => {
    respondWithOneMessage();

    await fetchGmail({ page: 1, query: "", size: 30 });

    expect(String(integrationFetch.mock.calls[0]?.[1])).toContain("maxResults=30");
  });
});

describe("searching Gmail", () => {
  it("sends the query to the server rather than filtering locally", async () => {
    respondWithOneMessage();

    await fetchGmail({ page: 1, query: "from:ana deck", size: 15 });

    expect(String(integrationFetch.mock.calls[0]?.[1])).toContain("q=from%3Aana%20deck");
  });
});

describe("attachments", () => {
  function respondWithParts(parts: { filename: string }[]) {
    integrationFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(list), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...detail, payload: { ...detail.payload, parts } }), {
          status: 200,
        }),
      );
  }

  it("flags a message that carries a named part, but not one that is only a body", async () => {
    respondWithParts([{ filename: "" }, { filename: "deck.pdf" }]);
    const withFile = await fetchGmail({ page: 1, query: "", size: 15 });

    integrationFetch.mockReset();
    respondWithParts([{ filename: "" }, { filename: "" }]);
    const withoutFile = await fetchGmail({ page: 1, query: "", size: 15 });

    expect(withFile.items[0]?.hasAttachment).toBe(true);
    expect(withoutFile.items[0]?.hasAttachment).toBe(false);
  });
});

describe("keeping the request small and the paging honest", () => {
  it("asks Google for only the fields it reads, so bodies never leave their server", async () => {
    respondWithOneMessage();

    await fetchGmail({ page: 1, query: "", size: 15 });

    const detailUrl = decodeURIComponent(String(integrationFetch.mock.calls[1]?.[1]));
    expect(detailUrl).toContain(
      "fields=id,threadId,labelIds,snippet,payload(headers,parts/filename)",
    );
  });

  it("keeps a separate page chain per search, so one cannot wipe another's", async () => {
    const respondWithToken = (token: string) =>
      integrationFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ...list, nextPageToken: token }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }));

    respondWithToken("invoice-page-2");
    await fetchGmail({ page: 1, query: "invoice", size: 15 });
    integrationFetch.mockReset();

    respondWithToken("inbox-page-2");
    await fetchGmail({ page: 1, query: "", size: 15 });
    integrationFetch.mockReset();

    respondWithToken("ignored");
    await fetchGmail({ page: 2, query: "invoice", size: 15 });

    expect(String(integrationFetch.mock.calls[0]?.[1])).toContain("pageToken=invoice-page-2");
  });
});
