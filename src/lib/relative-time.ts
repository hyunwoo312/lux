const ABSOLUTE_AFTER_DAYS = 28;

export function formatRelativeTime(time: string | number, now = Date.now()): string {
  const date = new Date(time);
  const minutes = Math.round((now - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < ABSOLUTE_AFTER_DAYS) return `${Math.round(days / 7)}w ago`;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
  });
}
