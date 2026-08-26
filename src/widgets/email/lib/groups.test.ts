import { describe, expect, it } from "vitest";
import { groupMessages } from "@/widgets/email/lib/groups";
import type { MailMessage } from "@/widgets/email/types";

const now = new Date(2026, 7, 28, 12, 0, 0).getTime();

const message = (receivedAt: Date): MailMessage => ({
  id: receivedAt.toISOString(),
  provider: "google",
  subject: "Q3 planning deck",
  from: "Jane Cooper",
  receivedAt: receivedAt.toISOString(),
  preview: "",
  unread: false,
  hasAttachment: false,
  url: "#",
});

const labelsFor = (...dates: Date[]) =>
  groupMessages(dates.map(message), now).map((group) => group.label);

describe("bucketing mail by age", () => {
  it("separates today, yesterday, the rest of the week and the rest of the month", () => {
    expect(
      labelsFor(
        new Date(2026, 7, 28, 1),
        new Date(2026, 7, 27, 23),
        new Date(2026, 7, 24, 9),
        new Date(2026, 7, 5, 9),
      ),
    ).toEqual(["Today", "Yesterday", "This week", "This month"]);
  });

  it("labels older mail by month, adding the year only when it is not this one", () => {
    const [thisYear, lastYear] = labelsFor(new Date(2026, 5, 5), new Date(2025, 5, 5));

    expect(thisYear).not.toMatch(/\d{4}/);
    expect(lastYear).toMatch(/2025/);
  });

  it("opens a group only when the label changes", () => {
    const groups = groupMessages(
      [new Date(2026, 7, 28, 9), new Date(2026, 7, 28, 8), new Date(2026, 7, 27, 20)].map(message),
      now,
    );

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday"]);
    expect(groups[0]?.messages).toHaveLength(2);
  });
});
