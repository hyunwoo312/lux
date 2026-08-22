import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { ensureOk, loadErrorMessage } from "@/lib/net";
import { tolerantArray } from "@/lib/persist";
import {
  GITHUB_JSON_HEADERS,
  graphql,
  NOTIFICATIONS_ENDPOINT,
} from "@/widgets/github/lib/api/client";
import type {
  InboxData,
  InboxIssue,
  InboxNotification,
  InboxPullRequest,
  PullRequestCi,
  PullRequestReview,
} from "@/widgets/github/types";

const notificationSchema = z.object({
  id: z.string(),
  reason: z.string(),
  updated_at: z.string(),
  subject: z.object({ title: z.string(), url: z.string().nullable(), type: z.string() }),
  repository: z.object({
    full_name: z.string(),
    html_url: z.string(),
    private: z.boolean(),
  }),
});

function notificationUrl(subjectUrl: string | null, type: string, repoUrl: string): string {
  if (subjectUrl && (type === "PullRequest" || type === "Issue")) {
    return subjectUrl
      .replace("https://api.github.com/repos/", "https://github.com/")
      .replace(/\/pulls\/(\d+)$/, "/pull/$1");
  }
  return repoUrl;
}

async function fetchNotifications(signal?: AbortSignal): Promise<InboxNotification[]> {
  const response = await integrationFetch("github", NOTIFICATIONS_ENDPOINT, {
    headers: GITHUB_JSON_HEADERS,
    signal,
  });
  ensureOk(response, "GitHub notifications request failed");
  const parsed = z.array(z.unknown()).safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("Unexpected GitHub notifications response");
  }
  return parsed.data
    .map((entry) => notificationSchema.safeParse(entry))
    .flatMap((result) => (result.success ? [result.data] : []))
    .map((entry) => ({
      id: entry.id,
      title: entry.subject.title,
      reason: entry.reason,
      repo: entry.repository.full_name,
      isPrivate: entry.repository.private,
      updatedAt: entry.updated_at,
      url: notificationUrl(entry.subject.url, entry.subject.type, entry.repository.html_url),
    }));
}

const INBOX_ITEMS_QUERY = `query {
  reviewRequested: search(query: "is:open is:pr review-requested:@me", type: ISSUE, first: 20) {
    nodes { ...pr }
  }
  mine: search(query: "is:open is:pr author:@me", type: ISSUE, first: 20) {
    nodes { ...pr }
  }
  assigned: search(query: "is:open is:issue assignee:@me", type: ISSUE, first: 20) {
    nodes { ...issue }
  }
  mentioned: search(query: "is:open is:issue mentions:@me", type: ISSUE, first: 20) {
    nodes { ...issue }
  }
}
fragment pr on PullRequest {
  id
  title
  url
  number
  isDraft
  updatedAt
  repository { nameWithOwner isPrivate }
  author { login }
  reviewDecision
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}
fragment issue on Issue {
  id
  title
  url
  number
  updatedAt
  repository { nameWithOwner isPrivate }
}`;

const prNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  number: z.number(),
  isDraft: z.boolean(),
  updatedAt: z.string(),
  repository: z.object({ nameWithOwner: z.string(), isPrivate: z.boolean() }),
  author: z.object({ login: z.string() }).nullable(),
  reviewDecision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED"]).nullable(),
  commits: z.object({
    nodes: z.array(
      z.object({
        commit: z.object({
          statusCheckRollup: z.object({ state: z.string() }).nullable(),
        }),
      }),
    ),
  }),
});

const issueNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  number: z.number(),
  updatedAt: z.string(),
  repository: z.object({ nameWithOwner: z.string(), isPrivate: z.boolean() }),
});

const searchNodes = z.object({ nodes: z.array(z.unknown()) });

const inboxItemsSchema = z.object({
  data: z.object({
    reviewRequested: searchNodes,
    mine: searchNodes,
    assigned: searchNodes,
    mentioned: searchNodes,
  }),
});

function toCi(state: string | undefined): PullRequestCi {
  if (state === "SUCCESS") return "success";
  if (state === "FAILURE" || state === "ERROR") return "failure";
  if (state === "PENDING" || state === "EXPECTED") return "pending";
  return "none";
}

function toReview(decision: string | null): PullRequestReview {
  if (decision === "APPROVED") return "approved";
  if (decision === "CHANGES_REQUESTED") return "changesRequested";
  if (decision === "REVIEW_REQUIRED") return "reviewRequired";
  return "none";
}

function toPullRequest(node: unknown, kind: InboxPullRequest["kind"]): InboxPullRequest | null {
  const parsed = prNodeSchema.safeParse(node);
  if (!parsed.success) return null;
  const pr = parsed.data;
  return {
    id: pr.id,
    title: pr.title,
    url: pr.url,
    number: pr.number,
    repo: pr.repository.nameWithOwner,
    isPrivate: pr.repository.isPrivate,
    isDraft: pr.isDraft,
    author: pr.author?.login ?? "unknown",
    updatedAt: pr.updatedAt,
    kind,
    ci: toCi(pr.commits.nodes[0]?.commit.statusCheckRollup?.state),
    review: toReview(pr.reviewDecision),
  };
}

function toIssue(node: unknown, kind: InboxIssue["kind"]): InboxIssue | null {
  const parsed = issueNodeSchema.safeParse(node);
  if (!parsed.success) return null;
  const issue = parsed.data;
  return {
    id: issue.id,
    title: issue.title,
    url: issue.url,
    number: issue.number,
    repo: issue.repository.nameWithOwner,
    isPrivate: issue.repository.isPrivate,
    updatedAt: issue.updatedAt,
    kind,
  };
}

function dedupeById<T extends { id: string }>(items: (T | null)[]): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const item of items) {
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      kept.push(item);
    }
  }
  return kept;
}

type InboxItems = { pullRequests: InboxPullRequest[]; issues: InboxIssue[] };

async function fetchInboxItems(signal?: AbortSignal): Promise<InboxItems> {
  const parsed = inboxItemsSchema.safeParse(await graphql(INBOX_ITEMS_QUERY, signal));
  if (!parsed.success) {
    throw new Error("Unexpected GitHub inbox response");
  }
  const { reviewRequested, mine, assigned, mentioned } = parsed.data.data;

  return {
    pullRequests: dedupeById([
      ...reviewRequested.nodes.map((node) => toPullRequest(node, "reviewRequested")),
      ...mine.nodes.map((node) => toPullRequest(node, "mine")),
    ]),
    issues: dedupeById([
      ...assigned.nodes.map((node) => toIssue(node, "assigned")),
      ...mentioned.nodes.map((node) => toIssue(node, "mention")),
    ]),
  };
}

export async function markGithubThreadRead(id: string): Promise<void> {
  const response = await integrationFetch(
    "github",
    `${NOTIFICATIONS_ENDPOINT}/threads/${encodeURIComponent(id)}`,
    { method: "PATCH", headers: GITHUB_JSON_HEADERS },
  );
  ensureOk(response, "GitHub notification update failed");
}

export async function unsubscribeGithubThread(id: string): Promise<void> {
  const response = await integrationFetch(
    "github",
    `${NOTIFICATIONS_ENDPOINT}/threads/${encodeURIComponent(id)}/subscription`,
    { method: "DELETE", headers: GITHUB_JSON_HEADERS },
  );
  ensureOk(response, "GitHub unsubscribe failed");
}

export async function markAllGithubNotificationsRead(): Promise<void> {
  const response = await integrationFetch("github", NOTIFICATIONS_ENDPOINT, {
    method: "PUT",
    headers: { ...GITHUB_JSON_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
  ensureOk(response, "GitHub notifications update failed");
}

function sectionErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? loadErrorMessage(reason, fallback) : fallback;
}

export async function fetchInbox(signal?: AbortSignal): Promise<InboxData> {
  const [notifications, items] = await Promise.allSettled([
    fetchNotifications(signal),
    fetchInboxItems(signal),
  ]);

  if (notifications.status === "rejected" && items.status === "rejected") {
    throw notifications.reason;
  }

  return {
    notifications: notifications.status === "fulfilled" ? notifications.value : [],
    pullRequests: items.status === "fulfilled" ? items.value.pullRequests : [],
    issues: items.status === "fulfilled" ? items.value.issues : [],
    notificationsError:
      notifications.status === "rejected"
        ? sectionErrorMessage(notifications.reason, "Couldn’t load notifications.")
        : undefined,
    itemsError:
      items.status === "rejected"
        ? sectionErrorMessage(items.reason, "Couldn’t load pull requests and issues.")
        : undefined,
  };
}

const cachedNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  repo: z.string(),
  isPrivate: z.boolean(),
  updatedAt: z.string(),
  url: z.string(),
});

const cachedPullRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  number: z.number(),
  repo: z.string(),
  isPrivate: z.boolean(),
  isDraft: z.boolean().catch(false),
  author: z.string().catch("unknown"),
  updatedAt: z.string(),
  kind: z.enum(["reviewRequested", "mine"]),
  ci: z.enum(["success", "failure", "pending", "none"]).catch("none"),
  review: z.enum(["approved", "changesRequested", "reviewRequired", "none"]).catch("none"),
});

const cachedIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  number: z.number(),
  repo: z.string(),
  isPrivate: z.boolean(),
  updatedAt: z.string(),
  kind: z.enum(["assigned", "mention"]),
});

const cachedInboxSchema = z.object({
  notifications: tolerantArray(cachedNotificationSchema),
  pullRequests: tolerantArray(cachedPullRequestSchema),
  issues: tolerantArray(cachedIssueSchema),
  notificationsError: z.string().optional().catch(undefined),
  itemsError: z.string().optional().catch(undefined),
});

export function parseCachedInbox(raw: unknown): InboxData | null {
  const result = cachedInboxSchema.safeParse(raw);
  return result.success ? result.data : null;
}
