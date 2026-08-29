import { useMemo } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { Heatmap, HeatmapLegend } from "@/widgets/github/components/ContributionsChart";
import { ContributionsStats } from "@/widgets/github/components/ContributionsStats";
import { InboxList } from "@/widgets/github/components/inbox/InboxList";
import { ReleaseList } from "@/widgets/github/components/ReleasesView";
import { buildContributions } from "@/widgets/github/lib/contributions";
import { localDayKey } from "@/lib/clock";
import { heatmapMetrics } from "@/widgets/github/lib/heatmap";
import { useGithub } from "@/widgets/github/useGithubStore";
import type {
  ContributionDay,
  ContributionLevel,
  ContributionsData,
  InboxData,
  ReleasesData,
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
  for (let week = 0; week < WEEKS; week += 1) {
    const days: ContributionDay[] = [];
    for (let day = 0; day < 7; day += 1) {
      const index = week * 7 + day;
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const level = sampleLevel(index);
      const count = level === 0 ? 0 : level * 3 + (index % 4);
      total += count;
      days.push({ date: date.toISOString().slice(0, 10), count, level });
    }
    weeks.push(days);
  }
  return buildContributions(weeks, total);
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
  issues: [
    {
      id: "i1",
      title: "Search returns stale results after filter change",
      url: "#",
      number: 274,
      repo: "acme/web",
      isPrivate: false,
      updatedAt: hoursAgo(3),
      kind: "assigned",
    },
    {
      id: "i2",
      title: "Proposal: unify the toast + banner components",
      url: "#",
      number: 258,
      repo: "acme/web",
      isPrivate: false,
      updatedAt: hoursAgo(20),
      kind: "mention",
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

const SAMPLE_RELEASES: ReleasesData = {
  watchedCount: 24,
  watchedScanned: 24,
  releases: [
    {
      repo: "acme/api",
      isPrivate: false,
      name: "Streaming responses",
      tagName: "v4.2.0",
      url: "#",
      publishedAt: hoursAgo(5),
      isPrerelease: false,
    },
    {
      repo: "acme/cli",
      isPrivate: false,
      name: "v2.0.0-rc.1",
      tagName: "v2.0.0-rc.1",
      url: "#",
      publishedAt: hoursAgo(31),
      isPrerelease: true,
    },
    {
      repo: "acme/web",
      isPrivate: false,
      name: "Grid performance pass",
      tagName: "v1.9.3",
      url: "#",
      publishedAt: hoursAgo(96),
      isPrerelease: false,
    },
  ],
};

function SampleContributions() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const metrics = useMemo(() => heatmapMetrics(size.width), [size.width]);
  const weeks = useMemo(() => SAMPLE_CONTRIBUTIONS.weeks.slice(-metrics.weeks), [metrics.weeks]);

  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <ContributionsStats
        data={SAMPLE_CONTRIBUTIONS}
        total={SAMPLE_CONTRIBUTIONS.total}
        weeks={metrics.weeks}
      />
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden">
        <Heatmap
          weeks={weeks}
          metrics={metrics}
          total={SAMPLE_CONTRIBUTIONS.total}
          todayKey={localDayKey(new Date())}
        />
        <HeatmapLegend metrics={metrics} />
      </div>
    </div>
  );
}

export function GithubSignedOutPreview() {
  const view = useGithub((d) => d.view);

  if (view === "inbox") return <InboxList data={SAMPLE_INBOX} showPrivate newTab={false} />;
  if (view === "releases") return <ReleaseList data={SAMPLE_RELEASES} showPrivate newTab={false} />;
  return <SampleContributions />;
}
