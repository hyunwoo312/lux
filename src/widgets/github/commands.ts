import { Bell, Book, CircleDot, GitPullRequest, Tag } from "lucide-react";
import { matchesQuery, openResult } from "@/widgets/core/commandResult";
import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { formatRelativeTime } from "@/lib/relative-time";
import type { CommandResult, WidgetCommand } from "@/widgets/core/types";
import { invalidatePolledResource, readPolled } from "@/widgets/core/usePolledResource";
import { markAllGithubNotificationsRead } from "@/widgets/github/lib/api/inbox";
import { searchGithub } from "@/widgets/github/lib/api/search";
import { githubInbox, githubReleases } from "@/widgets/github/lib/resources";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { DEFAULT_DATA, useGithubStore } from "@/widgets/github/useGithubStore";
import { instanceData } from "@/widgets/core/instances";
import { needsAccount } from "@/widgets/core/commandSetup";
import {
  INBOX_CACHE_KEY,
  type InboxData,
  type InboxIssue,
  type InboxNotification,
  type InboxPullRequest,
  type IssueHit,
  type RepoHit,
  type Release,
  type ReleasesData,
} from "@/widgets/github/types";

function showsPrivate(): boolean {
  return instanceData("github", useGithubStore.getState().byInstance, DEFAULT_DATA).every(
    ({ data }) => data.showPrivate,
  );
}

function pullRequestRow(pr: InboxPullRequest): CommandResult {
  return {
    id: `github.pr.${pr.id}`,
    label: `#${pr.number} ${pr.title}`,
    detail: pr.repo,
    meta: formatRelativeTime(pr.updatedAt),
    section: pr.kind === "reviewRequested" ? "Review requests" : "Your pull requests",
    icon: GitPullRequest,
    run: () => openResult(pr.url),
  };
}

function issueRow(issue: InboxIssue): CommandResult {
  return {
    id: `github.issue.${issue.id}`,
    label: `#${issue.number} ${issue.title}`,
    detail: issue.repo,
    meta: formatRelativeTime(issue.updatedAt),
    section: issue.kind === "assigned" ? "Assigned to you" : "Mentions",
    icon: CircleDot,
    run: () => openResult(issue.url),
  };
}

function notificationRow(notification: InboxNotification): CommandResult {
  return {
    id: `github.notification.${notification.id}`,
    label: notification.title,
    detail: notification.repo,
    meta: formatRelativeTime(notification.updatedAt),
    section: "Notifications",
    icon: Bell,
    run: () => openResult(notification.url),
  };
}

function releaseRow(release: Release): CommandResult {
  return {
    id: `github.release.${release.repo}.${release.tagName}`,
    label: release.name || release.tagName,
    detail: release.repo,
    meta: formatRelativeTime(release.publishedAt),
    section: release.isPrerelease ? "Pre-releases" : "Releases",
    icon: Tag,
    run: () => openResult(release.url),
  };
}

function inboxRows(data: InboxData, needle: string): CommandResult[] {
  const showPrivate = showsPrivate();
  const reviews = visibleItems(data.pullRequests, showPrivate).filter(
    (pr) => pr.kind === "reviewRequested",
  );
  const mine = visibleItems(data.pullRequests, showPrivate).filter((pr) => pr.kind === "mine");
  return [
    ...reviews.map(pullRequestRow),
    ...mine.map(pullRequestRow),
    ...visibleItems(data.issues, showPrivate).map(issueRow),
    ...visibleItems(data.notifications, showPrivate).map(notificationRow),
  ].filter((row) => matchesQuery(`${row.label} ${row.detail ?? ""}`, needle));
}

function releaseRows(data: ReleasesData, needle: string): CommandResult[] {
  return visibleItems(data.releases, showsPrivate())
    .map(releaseRow)
    .filter((row) => matchesQuery(`${row.label} ${row.detail ?? ""}`, needle));
}

function repoRow(repo: RepoHit): CommandResult {
  return {
    id: `github.repo.${repo.nameWithOwner}`,
    label: repo.nameWithOwner,
    detail: repo.description ?? undefined,
    meta: repo.stars > 0 ? `${repo.stars.toLocaleString()} ★` : undefined,
    section: "Repositories",
    icon: Book,
    run: () => openResult(repo.url),
  };
}

function hitRow(hit: IssueHit): CommandResult {
  return {
    id: `github.hit.${hit.id}`,
    label: `#${hit.number} ${hit.title}`,
    detail: hit.repo,
    meta: formatRelativeTime(hit.updatedAt),
    section: hit.isPullRequest ? "Pull requests" : "Issues",
    icon: hit.isPullRequest ? GitPullRequest : CircleDot,
    run: () => openResult(hit.url),
  };
}

const ACCOUNT_COMMANDS: readonly WidgetCommand[] = [
  {
    kind: "provider",
    id: "github.search",
    label: "Search GitHub",
    description: "Find a repository, issue or pull request anywhere on GitHub",
    icon: GitHubServiceIcon,
    keywords: ["repo", "repository", "issue", "pull request", "code", "find"],
    placeholder: "Search GitHub",
    emptyMessage: (query) =>
      query === "" ? "Type to search GitHub." : `Nothing on GitHub matched “${query}”.`,
    search: async (query, signal) => {
      const needle = query.trim();
      if (needle === "") return [];
      const showPrivate = showsPrivate();
      const found = await searchGithub(needle, signal);
      return [
        ...visibleItems(found.repositories, showPrivate).map(repoRow),
        ...visibleItems(found.issues, showPrivate).map(hitRow),
      ];
    },
  },
  {
    kind: "provider",
    id: "github.inbox",
    label: "Inbox",
    description: "Review requests, issues and notifications waiting on you",
    icon: GitHubServiceIcon,
    keywords: ["notifications", "pull request", "review", "issue", "mention", "unread"],
    placeholder: "Search your inbox",
    emptyMessage: (query) =>
      query === "" ? "Inbox zero — nothing waiting." : `Nothing in your inbox matched “${query}”.`,
    search: async (query) => inboxRows(await readPolled(githubInbox), query.trim()),
  },
  {
    kind: "provider",
    id: "github.releases",
    label: "Releases",
    description: "Browse the latest releases from the repositories you watch",
    icon: GitHubServiceIcon,
    keywords: ["watched", "tag", "version", "changelog"],
    placeholder: "Search releases",
    emptyMessage: (query) =>
      query === ""
        ? "Watch a repository to follow its releases."
        : `No release matched “${query}”.`,
    search: async (query) => releaseRows(await readPolled(githubReleases), query.trim()),
  },
  {
    kind: "action",
    id: "github.markAllRead",
    label: "Mark all notifications read",
    description: "Clear every unread GitHub notification",
    icon: GitHubServiceIcon,
    keywords: ["inbox", "clear", "dismiss", "unread"],
    run: async () => {
      await markAllGithubNotificationsRead();
      invalidatePolledResource(INBOX_CACHE_KEY);
    },
  },
];

const githubAccount = () => needsAccount("github", "GitHub");

export const githubCommands = (): WidgetCommand[] =>
  ACCOUNT_COMMANDS.map((command) => ({ ...command, setup: githubAccount }));
