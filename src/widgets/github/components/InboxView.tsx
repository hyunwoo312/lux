import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  AtSign,
  Bell,
  CheckCircle2,
  CircleDot,
  Eye,
  GitMerge,
  GitPullRequest,
  GitPullRequestDraft,
  Mail,
  MessageSquare,
  ShieldAlert,
  UserPlus,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadErrorMessage } from "@/lib/rate-limit";
import { formatRelativeTime } from "@/lib/relative-time";
import { Tooltip } from "@/components/ui/tooltip";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchInbox, parseCachedInbox } from "@/widgets/github/lib/github-api";
import { GithubPlaceholder } from "@/widgets/github/components/GithubPlaceholder";
import { useGithub } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import type {
  InboxData,
  InboxNotification,
  InboxPullRequest,
  PullRequestCi,
  PullRequestReview,
} from "@/widgets/github/types";

const REFRESH_MS = 3 * 60 * 1000;

const CI_CLASS: Record<PullRequestCi, string> = {
  success: "bg-emerald-500",
  failure: "bg-destructive",
  pending: "bg-warning",
  none: "bg-muted-foreground/40",
};

const CI_LABEL: Record<PullRequestCi, string> = {
  success: "Checks passing",
  failure: "Checks failing",
  pending: "Checks running",
  none: "No checks",
};

const REVIEW_LABEL: Record<PullRequestReview, string> = {
  approved: "Approved",
  changesRequested: "Changes requested",
  reviewRequired: "Review required",
  none: "",
};

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  review_requested: Eye,
  mention: AtSign,
  team_mention: AtSign,
  comment: MessageSquare,
  author: MessageSquare,
  assign: UserPlus,
  ci_activity: Zap,
  state_change: GitMerge,
  security_alert: ShieldAlert,
  invitation: Mail,
};

function notificationIcon(reason: string): LucideIcon {
  return NOTIFICATION_ICONS[reason] ?? Bell;
}

export function InboxView({ enabled, showPrivate }: { enabled: boolean; showPrivate: boolean }) {
  const newTab = useGithub((d) => d.openBehavior === "newTab");
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledResource(fetchInbox, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: "github:inbox",
    persist: true,
    parsePersisted: parseCachedInbox,
  });
  useGithubSync(refresh, isRefreshing, lastSyncedAt);

  if (state.status === "loading") return <GithubPlaceholder>Loading inbox…</GithubPlaceholder>;
  if (state.status === "error")
    return (
      <GithubPlaceholder>
        {loadErrorMessage(state.error, "Couldn’t load your inbox.")}
      </GithubPlaceholder>
    );
  if (state.status === "empty")
    return <GithubPlaceholder>Inbox zero — nothing waiting.</GithubPlaceholder>;

  return <InboxList data={state.data} showPrivate={showPrivate} newTab={newTab} />;
}

export function InboxList({
  data,
  showPrivate,
  newTab,
}: {
  data: InboxData;
  showPrivate: boolean;
  newTab: boolean;
}) {
  const pullRequests = useMemo(
    () => data.pullRequests.filter((pr) => showPrivate || !pr.isPrivate),
    [data.pullRequests, showPrivate],
  );
  const notifications = useMemo(
    () => data.notifications.filter((entry) => showPrivate || !entry.isPrivate),
    [data.notifications, showPrivate],
  );

  const reviewRequests = pullRequests.filter((pr) => pr.kind === "reviewRequested");
  const yourPrs = pullRequests.filter((pr) => pr.kind === "mine");

  if (pullRequests.length === 0 && notifications.length === 0) {
    return <GithubPlaceholder>Inbox zero — nothing waiting.</GithubPlaceholder>;
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-1">
      {reviewRequests.length > 0 && (
        <Section title="Review requests" count={reviewRequests.length}>
          {reviewRequests.map((pr) => (
            <PullRequestRow key={pr.id} pr={pr} newTab={newTab} />
          ))}
        </Section>
      )}
      {yourPrs.length > 0 && (
        <Section title="Your pull requests" count={yourPrs.length}>
          {yourPrs.map((pr) => (
            <PullRequestRow key={pr.id} pr={pr} newTab={newTab} />
          ))}
        </Section>
      )}
      {notifications.length > 0 && (
        <Section title="Notifications" count={notifications.length}>
          {notifications.map((entry) => (
            <NotificationRow key={entry.id} notification={entry} newTab={newTab} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3
        className="
          text-muted-foreground text-2xs flex items-center gap-1.5 px-2 font-semibold tracking-wide
          uppercase
        "
      >
        <span>{title}</span>
        <span className="text-muted-foreground/50 tabular-nums">{count}</span>
      </h3>
      {children}
    </div>
  );
}

function PullRequestRow({ pr, newTab }: { pr: InboxPullRequest; newTab: boolean }) {
  const status = [
    pr.isDraft ? "Draft" : null,
    CI_LABEL[pr.ci],
    pr.review === "none" ? null : REVIEW_LABEL[pr.review],
  ]
    .filter(Boolean)
    .join(" · ");

  const meta = [
    `${pr.repo} #${pr.number}`,
    pr.kind === "reviewRequested" ? pr.author : null,
    formatRelativeTime(pr.updatedAt),
  ]
    .filter(Boolean)
    .join(" · ");

  const Icon = pr.isDraft ? GitPullRequestDraft : GitPullRequest;

  return (
    <Tooltip content={<PullRequestStatus pr={pr} />} solid side="top" align="end">
      <a
        href={pr.url}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        aria-label={`${pr.title} — ${status}`}
        className="hover:bg-foreground/5 flex items-center gap-2 rounded-md px-2 py-1.5"
      >
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            pr.isDraft ? "text-muted-foreground" : "text-foreground",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-xs font-medium">{pr.title}</p>
          <p className="text-muted-foreground text-2xs truncate">{meta}</p>
        </div>
        <ReviewBadge review={pr.review} />
        <span className={cn("size-2 shrink-0 rounded-full", CI_CLASS[pr.ci])} aria-hidden />
      </a>
    </Tooltip>
  );
}

function PullRequestStatus({ pr }: { pr: InboxPullRequest }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground/90 max-w-[12rem] truncate font-medium">{pr.title}</span>
      {pr.isDraft && (
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <GitPullRequestDraft className="size-3" aria-hidden />
          Draft
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("size-2 rounded-full", CI_CLASS[pr.ci])} aria-hidden />
        {CI_LABEL[pr.ci]}
      </span>
      {pr.review !== "none" && (
        <span className="inline-flex items-center gap-1.5">
          <ReviewBadge review={pr.review} />
          {REVIEW_LABEL[pr.review]}
        </span>
      )}
      <span className="text-muted-foreground">
        {pr.repo} #{pr.number} · {formatRelativeTime(pr.updatedAt)}
      </span>
    </div>
  );
}

function ReviewBadge({ review }: { review: PullRequestReview }) {
  if (review === "none") return null;
  if (review === "approved")
    return <CheckCircle2 className="size-3 shrink-0 text-emerald-500" aria-hidden />;
  if (review === "changesRequested")
    return <XCircle className="text-destructive size-3 shrink-0" aria-hidden />;
  return <CircleDot className="text-muted-foreground size-3 shrink-0" aria-hidden />;
}

function NotificationRow({
  notification,
  newTab,
}: {
  notification: InboxNotification;
  newTab: boolean;
}) {
  const Icon = notificationIcon(notification.reason);
  const meta = `${notification.repo} · ${notification.reason.replace(/_/g, " ")} · ${formatRelativeTime(notification.updatedAt)}`;
  return (
    <a
      href={notification.url}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className="hover:bg-foreground/5 flex items-center gap-2 rounded-md px-2 py-1.5"
    >
      <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-xs font-medium">{notification.title}</p>
        <p className="text-muted-foreground text-2xs truncate">{meta}</p>
      </div>
    </a>
  );
}
