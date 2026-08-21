import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { openUrl } from "@/lib/open-url";
import { BaseDiamond, OutDots } from "@/widgets/sports/components/BaseDiamond";
import { LineScore } from "@/widgets/sports/components/LineScore";
import { TeamLogo } from "@/widgets/sports/components/TeamLogo";
import { useChangeFlash } from "@/widgets/sports/hooks/useChangeFlash";
import { COLUMN } from "@/widgets/sports/lib/columns";
import { peopleFor, type DetailPerson } from "@/widgets/sports/lib/detail";
import { formatSituation } from "@/widgets/sports/lib/situation";
import type { Match } from "@/widgets/sports/types";

function TeamStat({ value, side }: { value: string | undefined; side: "away" | "home" }) {
  const home = side === "home";
  return (
    <>
      {home ? <span className={COLUMN.score} /> : <span className={COLUMN.logo} />}
      <span
        className={cn(
          COLUMN.name,
          "text-ink-3 text-micro font-normal",
          home ? "text-left" : "text-right",
        )}
      >
        {value ?? ""}
      </span>
      {home ? <span className={COLUMN.logo} /> : <span className={COLUMN.score} />}
    </>
  );
}

function FlashBox({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "-m-0.5 rounded p-0.5 ring-1 ring-transparent transition-colors duration-300",
        on && "bg-primary/15 ring-primary/40",
      )}
    >
      {children}
    </span>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="border-border/50 border-t pt-2">{children}</div>;
}

function PersonRow({ logo, label, name, detail }: DetailPerson) {
  return (
    <div className="flex items-center gap-1.5">
      <TeamLogo src={logo} className="size-3" />
      <span className="text-micro text-ink min-w-0 shrink truncate font-medium">{name}</span>
      {label ? <span className="text-ink-4 text-micro shrink-0 font-medium">{label}</span> : null}
      {detail ? (
        <span className="text-micro text-ink-3 ml-auto min-w-0 truncate tabular-nums">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

export function MatchDetail({ match }: { match: Match }) {
  const situation = match.situation;
  const hasCount = situation?.balls != null && situation.strikes != null;
  const meta = [match.venue, match.broadcast].filter(Boolean).join(" · ");
  const hasRecords = Boolean(match.away.record || match.home.record);

  const live = match.state === "in";
  const people = peopleFor(match);
  const countChanged = useChangeFlash(
    hasCount ? `${situation?.balls}-${situation?.strikes}` : null,
    live,
  );
  const basesChanged = useChangeFlash(situation?.bases.join(",") ?? null, live);
  const outsChanged = useChangeFlash(situation?.outs ?? null, live);

  return (
    <div className="flex flex-col gap-2 px-2 pt-1 pb-2.5">
      {hasRecords ? (
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex-1" />
          <div className="flex shrink-0 items-center gap-1">
            <TeamStat value={match.away.record} side="away" />
            <span className={COLUMN.separator} />
            <TeamStat value={match.home.record} side="home" />
          </div>
          <span aria-hidden className="flex-1" />
        </div>
      ) : null}

      {match.away.periods.length > 0 || match.home.periods.length > 0 ? (
        <Section>
          <LineScore match={match} />
        </Section>
      ) : null}

      {people.length > 0 ? (
        <Section>
          <p className="text-ink-4 text-micro mb-1.5 font-medium uppercase">
            {match.state === "pre" ? "Probable starters" : "Top performers"}
          </p>
          <div className="flex flex-col gap-1">
            {people.map((person, index) => (
              <PersonRow key={`${person.name}-${index}`} {...person} />
            ))}
          </div>
        </Section>
      ) : null}

      {situation ? (
        <div className="border-border/50 flex items-center justify-center gap-2.5 border-t pt-2">
          <span className="sr-only">{formatSituation(situation)}</span>
          <FlashBox on={basesChanged}>
            <BaseDiamond bases={situation.bases} />
          </FlashBox>
          {hasCount ? (
            <span
              aria-hidden
              className={cn(
                "text-micro rounded font-semibold tabular-nums transition-colors duration-300",
                countChanged ? "bg-primary/15 text-primary" : "text-ink",
              )}
            >
              {situation.balls}–{situation.strikes}
            </span>
          ) : null}
          {situation.outs != null ? (
            <FlashBox on={outsChanged}>
              <OutDots outs={situation.outs} />
            </FlashBox>
          ) : null}
        </div>
      ) : null}

      {situation?.lastPlay ? (
        <p className="text-ink-3 text-micro truncate text-center italic">{situation.lastPlay}</p>
      ) : null}

      {meta || match.link ? (
        <div className="border-border/50 flex items-center gap-2 border-t pt-2">
          <span className="text-ink-4 text-micro min-w-0 flex-1 truncate">{meta}</span>
          {match.link ? (
            <button
              type="button"
              onClick={() => openUrl(match.link ?? "", "newTab")}
              className="
                press cursor-pointer text-ink-3
                hover:text-primary
                text-micro flex shrink-0 items-center gap-1
              "
            >
              ESPN
              <ExternalLink className="size-2.5" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
