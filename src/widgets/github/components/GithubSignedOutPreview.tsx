import { useElementSize } from "@/hooks/useElementSize";
import { Heatmap, Stats } from "@/widgets/github/components/ContributionsChart";
import { InboxList } from "@/widgets/github/components/InboxView";
import { useGithub } from "@/widgets/github/useGithubStore";
import type {
  ContributionDay,
  ContributionLevel,
  ContributionsData,
  InboxData,
} from "@/widgets/github/types";

const WEEKS = 53;

function sampleLevel(index: number): ContributionLevel {
  const hash = (index * 2654435761) % 100;
  if (hash < 45) return 0;
  if (hash < 68) return 1;
  if (hash < 84) return 2;
  if (hash < 95) return 3;
  return 4;
}

function buildSampleContributions(): ContributionsData {
  const totalDays = WEEKS * 7;
  const start = new Date();
  start.setDate(start.getDate() - (totalDays - 1));
  const weeks: ContributionDay[][] = [];
  let total = 0;
  let current = 0;
  let longest = 0;
  for (let week = 0; week < WEEKS; week += 1) {
    const days: ContributionDay[] = [];
    for (let day = 0; day < 7; day += 1) {
      const index = week * 7 + day;
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const level = sampleLevel(index);
      const count = level === 0 ? 0 : level * 3 + (index % 4);
      total += count;
      current = count > 0 ? current + 1 : 0;
      longest = Math.max(longest, current);
      days.push({ date: date.toISOString().slice(0, 10), count, level });
    }
    weeks.push(days);
  }
  return { weeks, total, currentStreak: current, longestStreak: longest };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const SAMPLE_CONTRIBUTIONS = buildSampleContributions();

const SAMPLE_INBOX: InboxData = {
  pullRequests: [
    {
      id: "pr1",
      title: "Fix flaky auth integration test",
      url: "#",
      number: 412,
      repo: "acme/api",
      isPrivate: false,
      isDraft: false,
      author: "octocat",
      updatedAt: hoursAgo(2),
      kind: "reviewRequested",
      ci: "success",
      review: "reviewRequired",
    },
    {
      id: "pr2",
      title: "Add dark mode toggle to settings",
      url: "#",
      number: 389,
      repo: "acme/web",
      isPrivate: false,
      isDraft: false,
      author: "you",
      updatedAt: hoursAgo(6),
      kind: "mine",
      ci: "pending",
      review: "changesRequested",
    },
    {
      id: "pr3",
      title: "WIP: refactor grid layout engine",
      url: "#",
      number: 401,
      repo: "acme/web",
      isPrivate: false,
      isDraft: true,
      author: "you",
      updatedAt: hoursAgo(26),
      kind: "mine",
      ci: "none",
      review: "none",
    },
  ],
  notifications: [
    {
      id: "n1",
      title: "Re: Memory leak on tab switch",
      reason: "mention",
      repo: "acme/api",
      isPrivate: false,
      updatedAt: hoursAgo(4),
      url: "#",
    },
    {
      id: "n2",
      title: "Deploy pipeline failed on main",
      reason: "ci_activity",
      repo: "acme/infra",
      isPrivate: false,
      updatedAt: hoursAgo(9),
      url: "#",
    },
  ],
};

function SampleContributions() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <Stats data={SAMPLE_CONTRIBUTIONS} />
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden">
        <Heatmap weeks={SAMPLE_CONTRIBUTIONS.weeks} size={size} />
      </div>
    </div>
  );
}

export function GithubSignedOutPreview() {
  const view = useGithub((d) => d.view);

  return view === "inbox" ? (
    <InboxList data={SAMPLE_INBOX} showPrivate newTab={false} />
  ) : (
    <SampleContributions />
  );
}
