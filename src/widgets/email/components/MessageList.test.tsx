// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "@/widgets/email/components/MessageList";
import type { MailMessage } from "@/widgets/email/types";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const message = (id: string, receivedAt: string): MailMessage => ({
  id,
  provider: "google",
  subject: `Subject ${id}`,
  from: "Jane Cooper",
  receivedAt,
  preview: "",
  unread: false,
  hasAttachment: false,
  url: "#",
});

function list(props: Partial<Parameters<typeof MessageList>[0]> = {}) {
  return render(
    <MessageList
      messages={[message("a", hoursAgo(1)), message("b", hoursAgo(30))]}
      newTab={false}
      filtered={false}
      showProvider={false}
      failures={{}}
      {...props}
    />,
  );
}

describe("the inbox list", () => {
  it("heads each stretch of messages with the age they share", () => {
    list();

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument();
  });

  it("keeps showing the mailbox that answered when the other one failed", () => {
    list({ failures: { microsoft: "Not responding — retrying shortly." } });

    expect(screen.getByText(/Outlook: Not responding/)).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
