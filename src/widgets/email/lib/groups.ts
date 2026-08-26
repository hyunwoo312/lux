import type { MailMessage } from "@/widgets/email/types";

export type MailGroup = { label: string; messages: MailMessage[] };

const DAY_MS = 86_400_000;
const WEEK_DAYS = 6;

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function groupLabel(receivedAt: string, now: number): string {
  const at = Date.parse(receivedAt);
  if (Number.isNaN(at)) return "Earlier";

  const today = startOfDay(now);
  if (at >= today) return "Today";
  if (at >= today - DAY_MS) return "Yesterday";
  if (at >= today - WEEK_DAYS * DAY_MS) return "This week";

  const date = new Date(at);
  const current = new Date(now);
  const sameYear = date.getFullYear() === current.getFullYear();
  if (sameYear && date.getMonth() === current.getMonth()) return "This month";

  return date.toLocaleDateString(undefined, {
    month: "long",
    year: sameYear ? undefined : "numeric",
  });
}

export function groupMessages(messages: MailMessage[], now: number): MailGroup[] {
  const groups: MailGroup[] = [];
  for (const message of messages) {
    const label = groupLabel(message.receivedAt, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.messages.push(message);
    else groups.push({ label, messages: [message] });
  }
  return groups;
}
