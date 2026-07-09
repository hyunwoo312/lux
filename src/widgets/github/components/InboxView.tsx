import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AtSign,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  CircleDot,
  Eye,
  GitMerge,
  GitPullRequest,
  GitPullRequestDraft,
  Loader2,
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
import { invalidatePolledResource, usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchInbox,
  markAllGithubNotificationsRead,
  markGithubThreadRead,
  parseCachedInbox,
  unsubscribeGithubThread,
} from "@/widgets/github/lib/github-api";
import { GithubPlaceholder } from "@/widgets/github/components/GithubPlaceholder";
import { useGithub } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import type {
  InboxData,
  InboxIssue,
  InboxNotification,
  InboxPullRequest,
  PullRequestCi,
  PullRequestReview,
} from "@/widgets/github/types";

const REFRESH_MS = 3 * 60 * 1000;
const INBOX_CACHE_KEY = "github:inbox";

type NotificationActions = {
  pending: Record<string, boolean>;
  marking: boolean;
  onMarkRead: (id: string) => void;
  onUnsubscribe: (id: string) => void;
  onMarkAllRead: () => void;
};

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
    cacheKey: INBOX_CACHE_KEY,
    persist: true,
    parsePersisted: parseCachedInbox,
  });
  useGithubSync(refresh, isRefreshing, lastSyncedAt);

  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [marking, setMarking] = useState(false);

  const reconcile = () => {
    invalidatePolledResource(INBOX_CACHE_KEY);
    refresh();
  };

  const runThread = (id: string, run: () => Promise<unknown>) => {
    if (pending[id]) return;
    setPending((prev) => ({ ...prev, [id]: true }));
    run().then(
      () => {
        reconcile();
        setPending((prev) => ({ ...prev, [id]: false }));
      },
      () => setPending((prev) => ({ ...prev, [id]: false })),
    );
  };

  const markAll = () => {
    if (marking) return;
    setMarking(true);
    markAllGithubNotificationsRead().then(
      () => {
        reconcile();
        setMarking(false);
      },
      () => setMarking(false),
    );
  };

  if (state.status === "loading") return <GithubPlaceholder>Loading inbox…</GithubPlaceholder>;
  if (state.status === "error")
    return (
      <GithubPlaceholder>
        {loadErrorMessage(state.error, "Couldn’t load your inbox.")}
      </GithubPlaceholder>
    );
  if (state.status === "empty")
    return <GithubPlaceholder>Inbox zero — nothing waiting.</GithubPlaceholder>;

  const actions: NotificationActions = {
    pending,
    marking,
    onMarkRead: (id) => runThread(id, () => markGithubThreadRead(id)),
    onUnsubscribe: (id) =>
      runThread(id, () => unsubscribeGithubThread(id).then(() => markGithubThreadRead(id))),
    onMarkAllRead: markAll,
  };

  return <InboxList data={state.data} showPrivate={showPrivate} newTab={newTab} actions={actions} />;
}

export function InboxList({
  data,
  showPrivate,
  newTab,
  actions,
}: {
  data: InboxData;
  showPrivate: boolean;
  newTab: boolean;
  actions?: NotificationActions;
}) {
  const pullRequests = useMemo(
    () => data.pullRequests.filter((pr) => showPrivate || !pr.isPrivate),
    [data.pullRequests, showPrivate],
  );
  const notifications = useMemo(
    () => data.notifications.filter((entry) => showPrivate || !entry.isPrivate),
    [data.notifications, showPrivate],
  );
  const issues = useMemo(
    () => data.issues.filter((entry) => showPrivate || !entry.isPrivate),
    [data.issues, showPrivate],
  );

  const reviewRequests = pullRequests.filter((pr) => pr.kind === "reviewRequested");
  const yourPrs = pullRequests.filter((pr) => pr.kind === "mine");
  const assignedIssues = issues.filter((issue) => issue.kind === "assigned");
  const mentions = issues.filter((issue) => issue.kind === "mention");

  if (pullRequests.length === 0 && issues.length === 0 && notifications.length === 0) {
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
      {assignedIssues.length > 0 && (
        <Section title="Assigned to you" count={assignedIssues.length}>
          {assignedIssues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} newTab={newTab} />
          ))}
        </Section>
      )}
      {mentions.length > 0 && (
        <Section title="Mentions" count={mentions.length}>
          {mentions.map((issue) => (
            <IssueRow key={issue.id} issue={issue} newTab={newTab} />
          ))}
        </Section>
      )}
      {notifications.length > 0 && (
        <Section
          title="Notifications"
          count={notifications.length}
          action={
            actions && (
              <MarkAllReadButton marking={actions.marking} onClick={actions.onMarkAllRead} />
            )
          }
        >
          {notifications.map((entry) => (
            <NotificationRow key={entry.id} notification={entry} newTab={newTab} actions={actions} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 px-2">
        <h3
          className="text-muted-foreground text-2xs font-semibold tracking-wide uppercase"
        >
          {title}
        </h3>
        <span className="text-muted-foreground/50 text-2xs tabular-nums">{count}</span>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function MarkAllReadButton({ marking, onClick }: { marking: boolean; onClick: () => void }) {
  return (
    <Tooltip content="Mark all read" solid>
      <button
        type="button"
        onClick={onClick}
        disabled={marking}
        aria-label="Mark all notifications read"
        className="
          text-muted-foreground
          hover:text-foreground
          flex size-6 items-center justify-center rounded-sm
          disabled:opacity-50
        "
      >
        {marking ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <CheckCheck className="size-3.5" aria-hidden />
        )}
      </button>
    </Tooltip>
  );
}

function NotificationActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="
        text-muted-foreground
        hover:text-foreground
        flex size-6 shrink-0 items-center justify-center rounded-sm
      "
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
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

function IssueRow({ issue, newTab }: { issue: InboxIssue; newTab: boolean }) {
  const Icon = issue.kind === "mention" ? AtSign : CircleDot;
  const meta = `${issue.repo} #${issue.number} · ${formatRelativeTime(issue.updatedAt)}`;
  return (
    <a
      href={issue.url}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className="hover:bg-foreground/5 flex items-center gap-2 rounded-md px-2 py-1.5"
    >
      <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-xs font-medium">{issue.title}</p>
        <p className="text-muted-foreground text-2xs truncate">{meta}</p>
      </div>
    </a>
  );
}

function NotificationRow({
  notification,
  newTab,
  actions,
}: {
  notification: InboxNotification;
  newTab: boolean;
  actions?: NotificationActions;
}) {
  const Icon = notificationIcon(notification.reason);
  const meta = `${notification.repo} · ${notification.reason.replace(/_/g, " ")} · ${formatRelativeTime(notification.updatedAt)}`;
  const pending = actions?.pending[notification.id] ?? false;
  return (
    <div className="group hover:bg-foreground/5 flex items-center gap-2 rounded-md px-2 py-1.5">
      <a
        href={notification.url}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-xs font-medium">{notification.title}</p>
          <p className="text-muted-foreground text-2xs truncate">{meta}</p>
        </div>
      </a>
      {actions &&
        (pending ? (
          <span className="text-muted-foreground flex size-6 shrink-0 items-center justify-center">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          </span>
        ) : (
          <div
            className="
              flex w-0 shrink-0 items-center overflow-hidden opacity-0 transition-[width,opacity]
              duration-200
              group-hover:w-12 group-hover:opacity-100
              group-focus-within:w-12 group-focus-within:opacity-100
            "
          >
            <NotificationActionButton
              label="Mark as read"
              icon={Check}
              onClick={() => actions.onMarkRead(notification.id)}
            />
            <NotificationActionButton
              label="Unsubscribe"
              icon={BellOff}
              onClick={() => actions.onUnsubscribe(notification.id)}
            />
          </div>
        ))}
    </div>
  );
}
