import { MessageList } from "@/widgets/email/components/MessageList";
import type { MailMessage } from "@/widgets/email/types";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

const SAMPLE: MailMessage[] = [
  {
    id: "sample-1",
    provider: "google",
    subject: "Re: Friday design review",
    preview:
      "Hi — can we push the review to Friday at 2pm? I still need the updated flows from Sam before we",
    from: "Ana Ruiz",
    receivedAt: minutesAgo(18),
    hasAttachment: false,
    unread: true,
    url: "#",
  },
  {
    id: "sample-2",
    provider: "microsoft",
    subject: "Q3 planning deck is ready for comments",
    preview:
      "The deck is ready for your comments. Highlights are revenue up 12% and two new hires in support",
    from: "Jane Cooper",
    receivedAt: minutesAgo(95),
    hasAttachment: true,
    unread: true,
    url: "#",
  },
  {
    id: "sample-3",
    provider: "google",
    subject: "Your receipt from Standard Coffee",
    preview:
      "Thanks for stopping by. Your order of one flat white came to £3.40, charged to the card ending",
    from: "Standard Coffee",
    receivedAt: minutesAgo(240),
    hasAttachment: false,
    unread: false,
    url: "#",
  },
  {
    id: "sample-4",
    provider: "microsoft",
    subject: "Deploy pipeline finished on main",
    preview:
      "Build 4821 completed in 6m 12s. All checks passed and the release is live on production now",
    from: "Build service",
    receivedAt: minutesAgo(430),
    hasAttachment: false,
    unread: false,
    url: "#",
  },
];

export function EmailSignedOutPreview() {
  return (
    <div className="h-full min-h-0 p-1">
      <MessageList messages={SAMPLE} newTab={false} filtered={false} showProvider failures={{}} />
    </div>
  );
}
