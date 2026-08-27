import { useMemo } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCheck, ChevronRight, Inbox, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { StateMessage } from "@/components/StateMessage";
import {
  IssueRow,
  NotificationRow,
  PullRequestRow,
  type NotificationActions,
} from "@/widgets/github/components/inbox/InboxRows";
import { groupByRepo, matchesFilter, type InboxEntry } from "@/widgets/github/lib/inbox-groups";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import {
  INBOX_FILTERS,
  INBOX_ZERO,
  type InboxData,
  type InboxFilter,
} from "@/widgets/github/types";

const FILTER_LABEL: Record<InboxFilter, string> = {
  all: "All",
  reviews: "Pull requests",
  issues: "Issues",
  notifications: "Notifications",
};

const FILTER_OPTIONS = INBOX_FILTERS.map((value) => ({ value, label: FILTER_LABEL[value] }));

export function InboxList({
  data,
  showPrivate,
  newTab,
  actions,
  onRetry,
}: {
  data: InboxData;
  showPrivate: boolean;
  newTab: boolean;
  actions?: NotificationActions;
  onRetry?: () => void;
}) {
  const instanceId = useWidgetInstanceId();
  const showDrafts = useGithub((d) => d.showDrafts);
  const filter = useGithub((d) => d.inboxFilter);
  const setInboxFilter = useGithubStore((s) => s.setInboxFilter);
  const collapsedRepos = useGithub((d) => d.collapsedRepos);
  const toggleRepoCollapsed = useGithubStore((s) => s.toggleRepoCollapsed);

  const groups = useMemo(() => {
    const entries: InboxEntry[] = [
      ...visibleItems(data.pullRequests, showPrivate)
        .filter((pr) => showDrafts || !pr.isDraft)
        .map(
          (pr): InboxEntry => ({
            kind: "pullRequest",
            id: pr.id,
            repo: pr.repo,
            updatedAt: pr.updatedAt,
            pr,
          }),
        ),
      ...visibleItems(data.issues, showPrivate).map(
        (issue): InboxEntry => ({
          kind: "issue",
          id: issue.id,
          repo: issue.repo,
          updatedAt: issue.updatedAt,
          issue,
        }),
      ),
      ...visibleItems(data.notifications, showPrivate).map(
        (notification): InboxEntry => ({
          kind: "notification",
          id: notification.id,
          repo: notification.repo,
          updatedAt: notification.updatedAt,
          notification,
        }),
      ),
    ];
    return groupByRepo(entries.filter((entry) => matchesFilter(entry, filter)));
  }, [data.pullRequests, data.issues, data.notifications, showPrivate, showDrafts, filter]);

  const hasNotifications = data.notifications.length > 0;
  const emptyForFilter = groups.length === 0 && !data.itemsError && !data.notificationsError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-1.5 px-2 pt-1">
        <div className="min-w-0">
          <ConfigSegmented
            label="Filter the inbox"
            value={filter}
            options={FILTER_OPTIONS}
            onChange={(value) => setInboxFilter(instanceId, value)}
          />
        </div>
        {actions && hasNotifications && (
          <div className="ml-auto shrink-0">
            <MarkAllReadButton marking={actions.marking} onClick={actions.onMarkAllRead} />
          </div>
        )}
      </div>
      {emptyForFilter ? (
        <StateMessage
          icon={Inbox}
          message={filter === "all" ? INBOX_ZERO : `Nothing under ${FILTER_LABEL[filter]}.`}
        />
      ) : (
        <div className="scroll-fade flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1">
          {groups.map((group) => (
            <RepoSection
              key={group.repo}
              repo={group.repo}
              count={group.entries.length}
              collapsed={collapsedRepos.includes(group.repo)}
              onToggle={() => toggleRepoCollapsed(instanceId, group.repo)}
            >
              {group.entries.map((entry) => {
                if (entry.kind === "pullRequest")
                  return <PullRequestRow key={entry.id} pr={entry.pr} newTab={newTab} />;
                if (entry.kind === "issue")
                  return <IssueRow key={entry.id} issue={entry.issue} newTab={newTab} />;
                return (
                  <NotificationRow
                    key={entry.id}
                    notification={entry.notification}
                    newTab={newTab}
                    actions={actions}
                  />
                );
              })}
            </RepoSection>
          ))}
          {data.itemsError && (
            <SectionError
              title="Pull requests & issues"
              message={data.itemsError}
              onRetry={onRetry}
            />
          )}
          {data.notificationsError && (
            <SectionError
              title="Notifications"
              message={data.notificationsError}
              onRetry={onRetry}
            />
          )}
        </div>
      )}
    </div>
  );
}

function RepoSection({
  repo,
  count,
  collapsed,
  onToggle,
  children,
}: {
  repo: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-0.5">
      <h3 className="flex px-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="
            press focus-ring text-ink-3 text-micro flex min-w-0 cursor-pointer items-center gap-1
            rounded-sm font-semibold tracking-wide
            hover:text-ink
          "
        >
          <ChevronRight
            aria-hidden
            className={cn("size-3 shrink-0 transition-transform", !collapsed && "rotate-90")}
          />
          <span className="min-w-0 truncate">{repo}</span>
          <span className="text-ink-3 shrink-0 tabular-nums">{count}</span>
        </button>
      </h3>
      {!collapsed && children}
    </section>
  );
}

function SectionError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 px-2">
        <h3 className="text-ink-3 text-micro font-semibold tracking-wide uppercase">{title}</h3>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="
              press focus-ring text-ink-3 text-micro ml-auto flex cursor-pointer items-center gap-1
              rounded-sm
              hover:text-ink
            "
          >
            <RotateCw className="size-3" aria-hidden />
            Retry
          </button>
        )}
      </div>
      <p className="text-ink-3 flex items-center gap-1.5 px-2 py-1 text-caption">
        <AlertCircle className="size-3.5 shrink-0" aria-hidden />
        {message}
      </p>
    </div>
  );
}

function MarkAllReadButton({ marking, onClick }: { marking: boolean; onClick: () => void }) {
  return (
    <Tooltip content="Mark all read" prose>
      <button
        type="button"
        onClick={onClick}
        disabled={marking}
        aria-label="Mark all notifications read"
        className="
          press focus-ring text-ink-3 text-micro flex cursor-pointer items-center gap-1 rounded-sm
          px-1.5 py-0.5
          hover:text-ink
          disabled:opacity-50
        "
      >
        {marking ? (
          <Spinner className="size-3.5" />
        ) : (
          <CheckCheck className="size-3.5" aria-hidden />
        )}
        Mark all read
      </button>
    </Tooltip>
  );
}
