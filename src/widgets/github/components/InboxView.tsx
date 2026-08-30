import { useState } from "react";
import { invalidatePolledResource, usePolledDefinition } from "@/widgets/core/usePolledResource";
import { githubInbox } from "@/widgets/github/lib/resources";
import {
  markAllGithubNotificationsRead,
  markGithubThreadRead,
  unsubscribeGithubThread,
} from "@/widgets/github/lib/api/inbox";
import { Inbox } from "lucide-react";
import { loadErrorMessage } from "@/lib/net";
import { showToast } from "@/stores/useToastStore";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { InboxList } from "@/widgets/github/components/inbox/InboxList";
import type { NotificationActions } from "@/widgets/github/components/inbox/InboxRows";
import { useGithub } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import { INBOX_CACHE_KEY, INBOX_ZERO } from "@/widgets/github/types";

function reportWriteFailure(error: unknown, fallback: string): void {
  showToast({
    key: "github-inbox-write",
    message: loadErrorMessage(error, fallback),
  });
}

export function InboxView({ enabled, showPrivate }: { enabled: boolean; showPrivate: boolean }) {
  const newTab = useGithub((d) => d.openBehavior === "newTab");
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledDefinition(githubInbox, {
    enabled,
  });
  useGithubSync(refresh, isRefreshing, lastSyncedAt);

  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [marking, setMarking] = useState(false);

  const reconcile = () => {
    invalidatePolledResource(INBOX_CACHE_KEY);
    refresh();
  };

  const clearPending = (id: string) =>
    setPending((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const runThread = (id: string, run: () => Promise<unknown>) => {
    if (pending[id]) return;
    setPending((prev) => ({ ...prev, [id]: true }));
    run().then(
      () => {
        reconcile();
        clearPending(id);
      },
      (error: unknown) => {
        clearPending(id);
        reportWriteFailure(error, "Couldn’t update that notification.");
      },
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
      (error: unknown) => {
        setMarking(false);
        reportWriteFailure(error, "Couldn’t mark your notifications read.");
      },
    );
  };

  if (state.status === "loading") return <StateMessage message="Loading inbox…" />;
  if (state.status === "error")
    return (
      <ErrorState
        error={state.error}
        service="GitHub"
        subject="your inbox"
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  if (state.status === "empty") return <StateMessage icon={Inbox} message={INBOX_ZERO} />;

  const actions: NotificationActions = {
    pending,
    marking,
    onMarkRead: (id) => runThread(id, () => markGithubThreadRead(id)),
    onUnsubscribe: (id) =>
      runThread(id, () => unsubscribeGithubThread(id).then(() => markGithubThreadRead(id))),
    onMarkAllRead: markAll,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InboxList
        data={state.data}
        showPrivate={showPrivate}
        newTab={newTab}
        actions={actions}
        onRetry={refresh}
      />
    </div>
  );
}
