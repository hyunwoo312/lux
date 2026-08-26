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
  url: "#",
  ...over,
});

const request = (over: Partial<Parameters<typeof mailCacheKey>[0]> = {}) => ({
  query: "",
  view: "all" as const,
  size: 15,
  ...over,
});

describe("reading the persisted inbox", () => {
  it("returns null rather than a half-built inbox when an entry is malformed", () => {
    expect(parseCachedMail([{ id: "a" }])).toBeNull();
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
