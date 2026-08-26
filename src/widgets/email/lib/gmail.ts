import { z } from "zod";
import { integrationFetch, useIntegrationStore } from "@/integrations";
import { ensureOk, parseResponse } from "@/lib/net";
import {
  PREVIEW_CHARS,
  type MailMessage,
  type MailPage,
  type MailQuery,
} from "@/widgets/email/types";

const LIST_BASE = "https://www.googleapis.com/gmail/v1/users/me/messages";

const MESSAGE_FIELDS = "id,threadId,labelIds,snippet,payload(headers,parts/filename)";

const pageTokens = new Map<string, string[]>();

const listSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).optional(),
  nextPageToken: z.string().optional(),
});

const detailSchema = z.object({
  id: z.string(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  payload: z
    .object({
      headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      parts: z.array(z.object({ filename: z.string().optional() })).optional(),
    })
    .optional(),
});

function header(headers: { name: string; value: string }[] | undefined, name: string): string {
  return headers?.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function connectedEmail(): string | undefined {
  return useIntegrationStore.getState().accounts.find((account) => account.providerId === "google")
    ?.email;
}

function inboxUrl(threadId: string, email: string | undefined): string {
  const account = email ? `?authuser=${encodeURIComponent(email)}` : "/u/0";
  return `https://mail.google.com/mail${account}#inbox/${threadId}`;
}

function toPreview(snippet: string): string {
  return snippet
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PREVIEW_CHARS);
}

function displayName(from: string): string {
  const named = /^\s*"?([^"<]+?)"?\s*</.exec(from);
  return named?.[1]?.trim() || from.replace(/[<>]/g, "").trim() || "Unknown sender";
}

async function fetchMessage(
  id: string,
  email: string | undefined,
  signal?: AbortSignal,
): Promise<MailMessage | null> {
  const response = await integrationFetch(
    "google",
    `https://www.googleapis.com/gmail/v1/users/me/messages/${id}` +
      `?format=full&fields=${encodeURIComponent(MESSAGE_FIELDS)}`,
    { signal },
  );
  ensureOk(response, "Gmail message request failed");

  const detail = parseResponse("Gmail message", detailSchema, await response.json());
  const headers = detail.payload?.headers;
  const received = header(headers, "Date");
  const at = received ? new Date(received) : null;

  return {
    id: `google:${detail.id}`,
    provider: "google",
    subject: header(headers, "Subject").trim() || "(no subject)",
    preview: toPreview(detail.snippet ?? ""),
    from: displayName(header(headers, "From")),
    receivedAt: at && !Number.isNaN(at.getTime()) ? at.toISOString() : new Date(0).toISOString(),
    unread: detail.labelIds?.includes("UNREAD") ?? false,
    hasAttachment: detail.payload?.parts?.some((part) => Boolean(part.filename)) ?? false,
    url: inboxUrl(detail.threadId ?? detail.id, email),
  };
}

async function requestList(
  query: string,
  size: number,
  token: string | undefined,
  signal?: AbortSignal,
): Promise<z.infer<typeof listSchema>> {
  const search = query ? `&q=${encodeURIComponent(query)}` : "";
  const url =
    `${LIST_BASE}?labelIds=INBOX&maxResults=${size}${search}` +
    (token ? `&pageToken=${encodeURIComponent(token)}` : "");
  const response = await integrationFetch("google", url, { signal });
  ensureOk(response, "Gmail request failed");
  return parseResponse("Gmail list", listSchema, await response.json());
}

export async function fetchGmail(
  { page, query, size }: MailQuery,
  signal?: AbortSignal,
): Promise<MailPage> {
  const key = `${query}\u0000${size}`;
  const tokens = pageTokens.get(key) ?? [];
  pageTokens.set(key, tokens);
  if (page <= 1) tokens.length = 0;

  const token = page <= 1 ? undefined : tokens[page];
  if (page > 1 && !token) return { items: [], hasNextPage: false };

  const list = await requestList(query, size, token, signal);
  if (list.nextPageToken) tokens[page + 1] = list.nextPageToken;

  const ids = list.messages ?? [];
  if (ids.length === 0) return { items: [], hasNextPage: false };

  const email = connectedEmail();
  const settled = await Promise.allSettled(ids.map(({ id }) => fetchMessage(id, email, signal)));
  const items = settled.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );

  return { items, hasNextPage: Boolean(list.nextPageToken) };
}
