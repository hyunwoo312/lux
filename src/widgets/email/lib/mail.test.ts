import { describe, expect, it } from "vitest";
import { mailCacheKey, parseCachedMail } from "@/widgets/email/lib/mail";
import { CACHED_MESSAGES, type MailMessage } from "@/widgets/email/types";

const message = (over: Partial<MailMessage>): MailMessage => ({
  id: "google:1",
  provider: "google",
  subject: "Q3 planning deck",
  from: "Jane Cooper",
  receivedAt: "2026-08-27T10:00:00.000Z",
  preview: "a short preview line",
  unread: false,
  hasAttachment: false,
  url: "https://mail.google.com/mail/u/0/#inbox/1",
  ...over,
});

const request = (over: Partial<Parameters<typeof mailCacheKey>[0]> = {}) => ({
  query: "",
  view: "all" as const,
  size: 15,
  ...over,
});

describe("reading the persisted inbox", () => {
  it("drops a message whose link is not a web address, keeping the rest of the inbox", () => {
    const good = message({});
    const stored = JSON.parse(
      JSON.stringify([message({ id: "google:2", url: "javascript:alert(1)" }), good]),
    ) as unknown;

    expect(parseCachedMail(stored)).toEqual([good]);
  });

  it("round-trips what the fetcher produces", () => {
    const stored = JSON.parse(JSON.stringify([message({})])) as unknown;
    expect(parseCachedMail(stored)).toEqual([message({})]);
  });

  it("keeps only a batch, so a new tab opens at the top of the inbox", () => {
    const many = Array.from({ length: 120 }, (_, i) => message({ id: `m${i}` }));
    expect(parseCachedMail(JSON.parse(JSON.stringify(many)) as unknown)).toHaveLength(
      CACHED_MESSAGES,
    );
  });
});

describe("keying the cache", () => {
  it("gives two different searches two different keys", () => {
    expect(mailCacheKey(request({ query: "deck" }))).not.toBe(
      mailCacheKey(request({ query: "invoice" })),
    );
  });

  it("separates each tab and the batch size", () => {
    expect(mailCacheKey(request({ view: "google" }))).not.toBe(mailCacheKey(request()));
    expect(mailCacheKey(request({ size: 30 }))).not.toBe(mailCacheKey(request()));
  });
});
