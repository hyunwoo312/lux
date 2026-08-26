import { useEffect, useMemo, useState } from "react";
import { usePagedResource } from "@/widgets/core/usePagedResource";
import { SearchField } from "@/components/SearchField";
import { ErrorState } from "@/components/StateMessage";
import { isOnline } from "@/lib/net";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { EmailSkeleton } from "@/widgets/email/components/EmailSkeleton";
import { MessageList } from "@/widgets/email/components/MessageList";
import { EmailSignedOutPreview } from "@/widgets/email/components/EmailSignedOutPreview";
import {
  fetchMailPage,
  mailCacheKey,
  messageKey,
  parseCachedMail,
  type MailRequest,
} from "@/widgets/email/lib/mail";
import { useEmail, useEmailStore } from "@/widgets/email/useEmailStore";
import { useEmailSync } from "@/widgets/email/useEmailSync";
import { useEmailView, useMailAccounts } from "@/widgets/email/useMailAccounts";
import { useUnreadCounts } from "@/widgets/email/useUnreadCounts";
import {
  EMAIL_REFRESH_MS,
  EMAIL_SYNC_COOLDOWN_MS,
  MAX_MESSAGES,
  SEARCH_DEBOUNCE_MS,
} from "@/widgets/email/types";

export function EmailWidget() {
  const instanceId = useWidgetInstanceId();
  const { connected, loaded } = useMailAccounts();
  const view = useEmailView();
  const query = useEmail((d) => d.query);
  const newTab = useEmail((d) => d.newTab);
  const batch = useEmail((d) => d.batch);
  const setQuery = useEmailStore((s) => s.setQuery);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const failures = useEmailStore((s) => s.failures);
  const enabled = connected.length > 0;

  const request = useMemo<MailRequest>(
    () => ({ query: search, view, size: Number(batch) }),
    [search, view, batch],
  );

  const {
    state,
    hasMore,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    autoRefresh,
    lastSyncedAt,
  } = usePagedResource((page, signal) => fetchMailPage(page, request, signal), {
    enabled,
    intervalMs: EMAIL_REFRESH_MS,
    maxItems: MAX_MESSAGES,
    cacheKey: mailCacheKey(request),
    persist: search.length === 0,
    resumePaging: false,
    getKey: messageKey,
    parsePersisted: parseCachedMail,
  });
  useEmailSync(refresh, isRefreshing, lastSyncedAt);
  useUnreadCounts(connected, lastSyncedAt);

  useEffect(() => {
    const reconcile = () => {
      if (document.visibilityState !== "visible" || !isOnline()) return;
      if (Date.now() - lastSyncedAt < EMAIL_SYNC_COOLDOWN_MS) return;
      autoRefresh();
    };
    document.addEventListener("visibilitychange", reconcile);
    return () => document.removeEventListener("visibilitychange", reconcile);
  }, [lastSyncedAt, autoRefresh]);

  const messages = state.status === "success" ? state.items : [];

  if (loaded && !enabled) return <EmailSignedOutPreview />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 p-1">
      <div className="shrink-0 px-0.5">
        <SearchField
          value={query}
          onChange={(next) => setQuery(instanceId, next)}
          label="Search mail"
          placeholder="Search your inbox…"
          size="sm"
        />
      </div>
      <div className="min-h-0 flex-1">
        {state.status === "loading" ? (
          <EmailSkeleton />
        ) : state.status === "error" ? (
          <ErrorState
            error={state.error}
            service="Mail"
            subject="your inbox"
            onRetry={refresh}
            retrying={isRefreshing}
          />
        ) : (
          <MessageList
            messages={messages}
            newTab={newTab}
            showProvider={view === "all"}
            failures={failures}
            filtered={search.length > 0}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </div>
  );
}
