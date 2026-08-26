import type { AccentPreset } from "@/widgets/core/accent";

export const EMAIL_TINT: AccentPreset = "indigo";

export const EMAIL_CACHE_KEY = "email:messages";
export const EMAIL_REFRESH_MS = 5 * 60 * 1000;
export const EMAIL_SYNC_COOLDOWN_MS = 60_000;
export const SEARCH_DEBOUNCE_MS = 400;

export const MAX_MESSAGES = 200;

export const BATCH_SIZES = ["10", "15", "20", "30"] as const;
export type BatchSize = (typeof BATCH_SIZES)[number];
export const DEFAULT_BATCH: BatchSize = "15";
export const CACHED_MESSAGES = 30;

export const MAIL_PROVIDERS = ["google", "microsoft"] as const;
export type MailProvider = (typeof MAIL_PROVIDERS)[number];

export const MAIL_PROVIDER_LABELS: Record<MailProvider, string> = {
  google: "Gmail",
  microsoft: "Outlook",
};

export const EMAIL_VIEWS = ["all", "google", "microsoft"] as const;
export type EmailView = (typeof EMAIL_VIEWS)[number];

export type MailQuery = {
  page: number;
  query: string;
  size: number;
};

export type MailPage = { items: MailMessage[]; hasNextPage: boolean };

export type MailMessage = {
  id: string;
  provider: MailProvider;
  subject: string;
  from: string;
  receivedAt: string;
  preview: string;
  unread: boolean;
  hasAttachment: boolean;
  url: string;
};

export const PREVIEW_CHARS = 200;
