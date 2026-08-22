import { useState } from "react";
import { invalidatePolledResource, usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchInbox,
  markAllGithubNotificationsRead,
  markGithubThreadRead,
  parseCachedInbox,
  unsubscribeGithubThread,
} from "@/widgets/github/lib/api/inbox";
import { GithubNotice } from "@/widgets/github/components/GithubNotice";
import { GithubStaleNotice } from "@/widgets/github/components/GithubStaleNotice";
import { InboxList } from "@/widgets/github/components/inbox/InboxList";
import type { NotificationActions } from "@/widgets/github/components/inbox/InboxRows";
import { useGithub } from "@/widgets/github/useGithubStore";
import { useGithubSync } from "@/widgets/github/useGithubSync";
import { INBOX_CACHE_KEY, INBOX_REFRESH_MS } from "@/widgets/github/types";

export function InboxView({ enabled, showPrivate }: { enabled: boolean; showPrivate: boolean }) {
  const newTab = useGithub((d) => d.openBehavior === "newTab");
  const { state, freshness, isRefreshing, refresh, lastSyncedAt } = usePolledResource(fetchInbox, {
    enabled,
    intervalMs: INBOX_REFRESH_MS,
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

  if (state.status === "loading") return <GithubNotice>Loading inbox…</GithubNotice>;
  if (state.status === "error")
    return (
      <GithubNotice error={state.error} fallback="Couldn’t load your inbox." onRetry={refresh} />
    );
  if (state.status === "empty") return <GithubNotice>Inbox zero — nothing waiting.</GithubNotice>;

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
      <GithubStaleNotice freshness={freshness} />
    </div>
  );
}
