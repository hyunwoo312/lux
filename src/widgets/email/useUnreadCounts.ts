import { useEffect } from "react";
import { fetchUnreadCounts } from "@/widgets/email/lib/counts";
import { useEmailStore } from "@/widgets/email/useEmailStore";
import type { MailProvider } from "@/widgets/email/types";

export function useUnreadCounts(connected: MailProvider[], syncedAt: number): void {
  const reportUnread = useEmailStore((s) => s.reportUnread);

  useEffect(() => {
    if (connected.length === 0) {
      reportUnread({});
      return;
    }
    const controller = new AbortController();
    void fetchUnreadCounts(connected, controller.signal).then((counts) => {
      if (!controller.signal.aborted) reportUnread(counts);
    });
    return () => controller.abort();
  }, [connected, syncedAt, reportUnread]);
}
