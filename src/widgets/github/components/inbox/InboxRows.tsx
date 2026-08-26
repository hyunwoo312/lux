import { Bell, BellOff, Check, type LucideIcon } from "lucide-react";
import {
  AtSign,
  CircleDot,
  GitMerge,
  GitPullRequest,
  GitPullRequestDraft,
  Mail,
  MessageSquare,
  ShieldAlert,
  UserPlus,
  Eye,
  Zap,
} from "lucide-react";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/relative-time";
import { CiBadge, ReviewBadge } from "@/widgets/github/components/inbox/InboxBadges";
import { CI_LABEL, REVIEW_LABEL } from "@/widgets/github/lib/inbox-labels";
import type { InboxIssue, InboxNotification, InboxPullRequest } from "@/widgets/github/types";

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

export type NotificationActions = {
  pending: Record<string, boolean>;
  marking: boolean;
  onMarkRead: (id: string) => void;
  onUnsubscribe: (id: string) => void;
  onMarkAllRead: () => void;
};

const KIND_LABEL: Record<string, string> = {
  reviewRequested: "Review requested",
  mine: "Yours",
  assigned: "Assigned",
  mention: "Mentioned",
};

export function PullRequestRow({ pr, newTab }: { pr: InboxPullRequest; newTab: boolean }) {
  const status = [pr.isDraft ? "Draft" : null, CI_LABEL[pr.ci], REVIEW_LABEL[pr.review]]
    .filter(Boolean)
    .join(" · ");
  const meta = [
    `#${pr.number}`,
    KIND_LABEL[pr.kind],
    pr.kind === "reviewRequested" ? pr.author : null,
    formatRelativeTime(pr.updatedAt),
  ]
    .filter(Boolean)
    .join(" · ");
  const Icon = pr.isDraft ? GitPullRequestDraft : GitPullRequest;

  return (
    <Tooltip
      content={`${CI_LABEL[pr.ci]}${pr.review === "none" ? "" : ` · ${REVIEW_LABEL[pr.review]}`}`}
      prose
    >
      <a
        href={pr.url}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        aria-label={`${pr.title} — ${status}`}
        className={ROW.item}
      >
        <Icon
          className={cn("size-3.5 shrink-0", pr.isDraft ? "text-ink-3" : "text-ink")}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate text-caption font-medium">{pr.title}</p>
          <p className="text-ink-3 text-micro truncate">{meta}</p>
        </div>
        <ReviewBadge review={pr.review} />
        <CiBadge ci={pr.ci} />
      </a>
    </Tooltip>
  );
}

export function IssueRow({ issue, newTab }: { issue: InboxIssue; newTab: boolean }) {
  const Icon = issue.kind === "mention" ? AtSign : CircleDot;
  const meta = [`#${issue.number}`, KIND_LABEL[issue.kind], formatRelativeTime(issue.updatedAt)]
    .filter(Boolean)
    .join(" · ");

  return (
    <a
      href={issue.url}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      className={ROW.item}
    >
      <Icon className="text-ink-3 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-caption font-medium">{issue.title}</p>
        <p className="text-ink-3 text-micro truncate">{meta}</p>
      </div>
    </a>
  );
}

export function NotificationRow({
  notification,
  newTab,
  actions,
}: {
  notification: InboxNotification;
  newTab: boolean;
  actions?: NotificationActions;
}) {
  const Icon = NOTIFICATION_ICONS[notification.reason] ?? Bell;
  const meta = `${notification.reason.replace(/_/g, " ")} · ${formatRelativeTime(notification.updatedAt)}`;
  const pending = actions?.pending[notification.id] ?? false;

  return (
    <div className={cn(ROW.item, "group relative")}>
      <a
        href={notification.url}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <Icon className="text-ink-3 size-3.5 shrink-0" aria-hidden />
        <div
          className={cn(
            "min-w-0 flex-1 transition-[padding] duration-200",
            actions && !pending && "group-hover:pr-14 group-focus-within:pr-14",
          )}
        >
          <p className="text-ink truncate text-caption font-medium">{notification.title}</p>
          <p className="text-ink-3 text-micro truncate">{meta}</p>
        </div>
      </a>
      {actions &&
        (pending ? (
          <span className="text-ink-3 flex size-6 shrink-0 items-center justify-center">
            <Spinner className="size-3.5" />
          </span>
        ) : (
          <div
            className="
              absolute top-1/2 right-2 flex -translate-y-1/2 translate-x-2 items-center gap-0.5
              opacity-0 transition duration-200
              group-hover:translate-x-0 group-hover:opacity-100
              group-focus-within:translate-x-0 group-focus-within:opacity-100
            "
          >
            <NotificationActionButton
              label={`Mark "${notification.title}" as read`}
              tooltip="Mark as read"
              icon={Check}
              onClick={() => actions.onMarkRead(notification.id)}
            />
            <NotificationActionButton
              label={`Unsubscribe from "${notification.title}"`}
              tooltip="Unsubscribe"
              icon={BellOff}
              onClick={() => actions.onUnsubscribe(notification.id)}
            />
          </div>
        ))}
    </div>
  );
}

function NotificationActionButton({
  label,
  tooltip,
  icon: Icon,
  onClick,
}: {
  label: string;
  tooltip: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="
          press focus-ring text-ink-3 flex size-6 shrink-0 cursor-pointer items-center
          justify-center rounded-sm
          hover:bg-foreground/10 hover:text-ink
        "
      >
        <Icon className="size-3.5" aria-hidden />
      </button>
    </Tooltip>
  );
}
