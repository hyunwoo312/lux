import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { ensureOk, parseResponse } from "@/lib/net";
import {
  PREVIEW_CHARS,
  type MailMessage,
  type MailPage,
  type MailQuery,
} from "@/widgets/email/types";

const BASE = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages";
const SELECT = "id,subject,from,receivedDateTime,isRead,webLink,bodyPreview,hasAttachments";

const messageSchema = z.object({
  id: z.string(),
  subject: z.string().nullish(),
  from: z
    .object({
      emailAddress: z.object({ name: z.string().nullish(), address: z.string().nullish() }),
    })
    .nullish(),
  receivedDateTime: z.string(),
  isRead: z.boolean().nullish(),
  bodyPreview: z.string().nullish(),
  hasAttachments: z.boolean().nullish(),
  webLink: z.string().nullish(),
});

const payloadSchema = z.object({
  value: z.array(messageSchema),
  "@odata.nextLink": z.string().optional(),
});

const nextLinks = new Map<string, string[]>();

function firstPageUrl(query: string, size: number): string {
  const search = query ? `&$search=${encodeURIComponent(`"${query}"`)}` : "";
  const order = query ? "" : `&$orderby=${encodeURIComponent("receivedDateTime desc")}`;
  return `${BASE}?$select=${SELECT}&$top=${size}${search}${order}`;
}

async function requestPage(
  url: string,
  signal?: AbortSignal,
): Promise<z.infer<typeof payloadSchema>> {
  const response = await integrationFetch("microsoft", url, { signal });
  ensureOk(response, "Outlook mail request failed");
  return parseResponse("Outlook mail", payloadSchema, await response.json());
}

function toMessages(payload: z.infer<typeof payloadSchema>): MailMessage[] {
  return payload.value.map((message) => {
    const sender = message.from?.emailAddress;
    return {
      id: `microsoft:${message.id}`,
      provider: "microsoft" as const,
      subject: message.subject?.trim() || "(no subject)",
      from: sender?.name?.trim() || sender?.address?.trim() || "Unknown sender",
      receivedAt: message.receivedDateTime,
      preview: (message.bodyPreview ?? "").replace(/\s+/g, " ").trim().slice(0, PREVIEW_CHARS),
      unread: message.isRead === false,
      hasAttachment: message.hasAttachments === true,
      url: message.webLink ?? "https://outlook.office.com/mail/",
    };
  });
}

export async function fetchOutlookMail(
  { page, query, size }: MailQuery,
  signal?: AbortSignal,
): Promise<MailPage> {
  const key = `${query}\u0000${size}`;
  const links = nextLinks.get(key) ?? [];
  nextLinks.set(key, links);
  if (page <= 1) links.length = 0;

  const url = page <= 1 ? firstPageUrl(query, size) : links[page];
  if (!url) return { items: [], hasNextPage: false };

  const payload = await requestPage(url, signal);
  const next = payload["@odata.nextLink"];
  if (next) links[page + 1] = next;

  return { items: toMessages(payload), hasNextPage: Boolean(next) };
}
