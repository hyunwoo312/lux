import { Paperclip } from "lucide-react";
import { formatRelativeTime } from "@/lib/relative-time";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";
import { SenderAvatar } from "@/widgets/email/components/SenderAvatar";
import { MAIL_PROVIDER_LABELS, type MailMessage } from "@/widgets/email/types";

type MessageRowProps = {
  message: MailMessage;
  newTab: boolean;
  showProvider: boolean;
  now: number;
};

export function MessageRow({ message, newTab, showProvider, now }: MessageRowProps) {
  const { from, subject, preview, unread, hasAttachment } = message;
  const when = formatRelativeTime(message.receivedAt, now);

  return (
    <a
      href={message.url}
      target={newTab ? "_blank" : undefined}
      rel="noreferrer"
      aria-label={`${subject} — from ${from}, ${MAIL_PROVIDER_LABELS[message.provider]}, ${when}${
        hasAttachment ? ", has an attachment" : ""
      }${unread ? ", unread" : ""}`}
      className={cn(ROW.itemAction, "items-center gap-3 px-2.5 py-2.5")}
    >
      <SenderAvatar
        from={from}
        provider={message.provider}
        showProvider={showProvider}
        unread={unread}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-caption",
              unread ? "text-ink font-semibold" : "text-ink-2 font-medium",
            )}
          >
            {from}
          </p>
          <span className="text-ink-3 shrink-0 text-micro tabular-nums">{when}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-caption",
              unread ? "text-ink font-medium" : "text-ink-2 font-normal",
            )}
          >
            {subject}
          </p>
          {hasAttachment && <Paperclip aria-hidden className="text-ink-3 size-3 shrink-0" />}
        </div>
        {preview && <p className="text-ink-3 truncate text-micro">{preview}</p>}
      </div>
    </a>
  );
}
