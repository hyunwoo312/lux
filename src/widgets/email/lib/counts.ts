import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { ensureOk, parseResponse } from "@/lib/net";
import type { MailProvider } from "@/widgets/email/types";

export type UnreadCounts = Partial<Record<MailProvider, number>>;

const gmailLabelSchema = z.object({ messagesUnread: z.number().nonnegative().optional() });
const outlookFolderSchema = z.object({ unreadItemCount: z.number().nonnegative().optional() });

async function gmailUnread(signal?: AbortSignal): Promise<number> {
  const response = await integrationFetch(
    "google",
    "https://www.googleapis.com/gmail/v1/users/me/labels/INBOX?fields=messagesUnread",
    { signal },
  );
  ensureOk(response, "Gmail unread count request failed");
  return parseResponse("Gmail label", gmailLabelSchema, await response.json()).messagesUnread ?? 0;
}

async function outlookUnread(signal?: AbortSignal): Promise<number> {
  const response = await integrationFetch(
    "microsoft",
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox?$select=unreadItemCount",
    { signal },
  );
  ensureOk(response, "Outlook unread count request failed");
  return (
    parseResponse("Outlook folder", outlookFolderSchema, await response.json()).unreadItemCount ?? 0
  );
}

const COUNTERS: Record<MailProvider, (signal?: AbortSignal) => Promise<number>> = {
  google: gmailUnread,
  microsoft: outlookUnread,
};

export async function fetchUnreadCounts(
  providers: readonly MailProvider[],
  signal?: AbortSignal,
): Promise<UnreadCounts> {
  const settled = await Promise.allSettled(providers.map((provider) => COUNTERS[provider](signal)));
  const counts: UnreadCounts = {};
  settled.forEach((result, index) => {
    const provider = providers[index];
    if (provider && result.status === "fulfilled") counts[provider] = result.value;
  });
  return counts;
}
