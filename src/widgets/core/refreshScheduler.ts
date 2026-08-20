import { isOnline, subscribeOnline } from "@/lib/net";

const MIN_TICK_MS = 1_000;

type ScheduledResource = {
  id: string;
  staleMs: number;
  pollIntervalMs?: number;
  getLastRefreshedAt: () => number;
  refresh: () => void;
  clearBackoff?: () => void;
};

class RefreshScheduler {
  private readonly resources = new Map<string, ScheduledResource>();
  private intervalId: number | undefined;
  private tickMs = 0;
  private listening = false;
  private unsubscribeOnline: (() => void) | null = null;

  register(resource: ScheduledResource): () => void {
    this.resources.set(resource.id, resource);
    this.startListening();
    this.syncTick();
    return () => {
      this.resources.delete(resource.id);
      this.syncTick();
      if (this.resources.size === 0) this.stopListening();
    };
  }

  private readonly wakeFromWindow = () => this.refreshDue({ includeNonPolling: true });
  private readonly wakeFromInterval = () => this.refreshDue({ includeNonPolling: false });

  private readonly wakeFromNetwork = (online: boolean) => {
    if (!online) return;
    for (const resource of this.resources.values()) resource.clearBackoff?.();
    this.refreshDue({ includeNonPolling: true });
  };

  private refreshDue({ includeNonPolling }: { includeNonPolling: boolean }): void {
    if (document.visibilityState !== "visible") return;
    if (!isOnline()) return;
    const now = Date.now();
    for (const resource of this.resources.values()) {
      if (!includeNonPolling && resource.pollIntervalMs === undefined) continue;
      if (now - resource.getLastRefreshedAt() >= resource.staleMs) resource.refresh();
    }
  }

  private syncTick(): void {
    const cadences = [...this.resources.values()]
      .map((resource) => resource.pollIntervalMs)
      .filter((ms): ms is number => typeof ms === "number" && ms > 0);
    const nextTickMs = cadences.length ? Math.max(MIN_TICK_MS, Math.min(...cadences)) : 0;
    if (nextTickMs === this.tickMs) return;
    this.tickMs = nextTickMs;
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (nextTickMs > 0) {
      this.intervalId = window.setInterval(this.wakeFromInterval, nextTickMs);
    }
  }

  private startListening(): void {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener("focus", this.wakeFromWindow);
    document.addEventListener("visibilitychange", this.wakeFromWindow);
    this.unsubscribeOnline = subscribeOnline(this.wakeFromNetwork);
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = false;
    window.removeEventListener("focus", this.wakeFromWindow);
    document.removeEventListener("visibilitychange", this.wakeFromWindow);
    this.unsubscribeOnline?.();
    this.unsubscribeOnline = null;
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.tickMs = 0;
  }
}

export const refreshScheduler = new RefreshScheduler();
