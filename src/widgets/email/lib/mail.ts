import { z } from "zod";
import { connectedProviders, useIntegrationStore } from "@/integrations";
import { describeFailure } from "@/lib/net";
import { httpUrlSchema } from "@/lib/open-url";
import { tolerantArray } from "@/lib/persist";
import { fetchGmail } from "@/widgets/email/lib/gmail";
import { createMerge, type Merge, type SourceFetcher } from "@/widgets/email/lib/merge";
import { fetchOutlookMail } from "@/widgets/email/lib/outlook";
import { useEmailStore } from "@/widgets/email/useEmailStore";
import {
  CACHED_MESSAGES,
  EMAIL_CACHE_KEY,
  MAIL_PROVIDER_LABELS,
  MAIL_PROVIDERS,
  type EmailView,
  type MailMessage,
  type MailPage,
  type MailProvider,
  type MailQuery,
} from "@/widgets/email/types";

type Fetcher = (query: MailQuery, signal?: AbortSignal) => Promise<MailPage>;

const PROVIDERS: Record<MailProvider, Fetcher> = {
  google: fetchGmail,
  microsoft: fetchOutlookMail,
};

export type MailRequest = Omit<MailQuery, "page"> & { view: EmailView };

export function sourcesFor(view: EmailView): MailProvider[] {
  const connected = connectedProviders(useIntegrationStore.getState().accounts, MAIL_PROVIDERS);
  return view === "all" ? connected : connected.filter((provider) => provider === view);
}

function receivedAt(message: MailMessage): number {
  return Date.parse(message.receivedAt);
}

const merges = new Map<string, Merge<MailMessage>>();

function mergeFor(
  key: string,
  providers: MailProvider[],
  request: MailRequest,
  fresh: boolean,
): Merge<MailMessage> {
  const existing = merges.get(key);
  if (existing && !fresh) return existing;
  const fetchers: SourceFetcher<MailMessage>[] = providers.map(
    (provider) => (page, signal) => PROVIDERS[provider]({ ...request, page }, signal),
  );
  const merge = createMerge(fetchers, receivedAt);
  merges.set(key, merge);
  return merge;
}

function report(providers: MailProvider[], failures: readonly (Error | undefined)[]): void {
  const reasons: Partial<Record<MailProvider, string>> = {};
  providers.forEach((provider, index) => {
    const error = failures[index];
    if (!error) return;
    reasons[provider] = describeFailure(error, {
      service: MAIL_PROVIDER_LABELS[provider],
      subject: "messages",
      register: "short",
    }).message;
  });
  useEmailStore.getState().reportFailures(providers, reasons);
}

export async function fetchMailPage(
  page: number,
  request: MailRequest,
  signal?: AbortSignal,
): Promise<MailPage> {
  const providers = sourcesFor(request.view);
  if (providers.length === 0) return { items: [], hasNextPage: false };

  const only = providers.length === 1 ? providers[0] : undefined;
  if (only) {
    report(providers, []);
    return PROVIDERS[only]({ ...request, page }, signal);
  }

  const key = `${mailCacheKey(request)}|${providers.join(",")}`;
  const merge = mergeFor(key, providers, request, page <= 1);

  try {
    const { items, hasNextPage, failures } = await merge.take(request.size, signal);
    report(providers, failures);
    return { items, hasNextPage };
  } catch (error) {
    merges.delete(key);
    throw error;
  }
}

export function mailCacheKey({ query, view, size }: MailRequest): string {
  return `${EMAIL_CACHE_KEY}:${view}:${size}:${query}`;
}

export function messageKey(message: MailMessage): string {
  return message.id;
}

const messageSchema = z.object({
  id: z.string(),
  provider: z.enum(MAIL_PROVIDERS),
  subject: z.string(),
  from: z.string(),
  receivedAt: z.string(),
  preview: z.string().catch(""),
  unread: z.boolean(),
  hasAttachment: z.boolean().catch(false),
  url: httpUrlSchema,
});

const cachedMailSchema = tolerantArray(messageSchema);

export function parseCachedMail(raw: unknown): MailMessage[] | null {
  if (!Array.isArray(raw)) return null;
  return cachedMailSchema.parse(raw).slice(0, CACHED_MESSAGES);
}
