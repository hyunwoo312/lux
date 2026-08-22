import type {
  InboxFilter,
  InboxIssue,
  InboxNotification,
  InboxPullRequest,
} from "@/widgets/github/types";

export type InboxEntry =
  | { kind: "pullRequest"; id: string; repo: string; updatedAt: string; pr: InboxPullRequest }
  | { kind: "issue"; id: string; repo: string; updatedAt: string; issue: InboxIssue }
  | {
      kind: "notification";
      id: string;
      repo: string;
      updatedAt: string;
      notification: InboxNotification;
    };

type RepoGroup = { repo: string; entries: InboxEntry[] };

export function groupByRepo(entries: InboxEntry[]): RepoGroup[] {
  const groups = new Map<string, InboxEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.repo);
    if (bucket) bucket.push(entry);
    else groups.set(entry.repo, [entry]);
  }
  return [...groups.entries()]
    .map(([repo, grouped]) => ({ repo, entries: grouped }))
    .sort((a, b) => newestOf(b.entries) - newestOf(a.entries));
}

function newestOf(entries: InboxEntry[]): number {
  return entries.reduce((newest, entry) => Math.max(newest, Date.parse(entry.updatedAt) || 0), 0);
}

export function attentionCount(
  pullRequests: InboxPullRequest[],
  notifications: InboxNotification[],
): number {
  return pullRequests.filter((pr) => pr.kind === "reviewRequested").length + notifications.length;
}

export function matchesFilter(entry: InboxEntry, filter: InboxFilter): boolean {
  switch (filter) {
    case "reviews":
      return entry.kind === "pullRequest";
    case "issues":
      return entry.kind === "issue";
    case "notifications":
      return entry.kind === "notification";
    default:
      return true;
  }
}
