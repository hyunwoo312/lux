import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Match, MatchTeam } from "@/widgets/sports/types";

function totals(team: MatchTeam, showHitsErrors: boolean): (string | number)[] {
  const runs = team.score ?? 0;
  return showHitsErrors ? [runs, team.hits ?? 0, team.errors ?? 0] : [runs];
}

function Cell({
  children,
  total,
  dim,
  divide,
  current,
}: {
  children: ReactNode;
  total?: boolean;
  dim?: boolean;
  divide?: boolean;
  current?: boolean;
}) {
  const blank = children === "0" || children === 0;
  return (
    <td
      className={cn(
        "px-1 py-0.5 text-center tabular-nums",
        divide && "border-border/60 border-l",
        current && "bg-foreground/5",
        total ? "text-ink font-semibold" : blank ? "text-ink-4" : dim ? "text-ink-3" : "text-ink",
      )}
    >
      {children}
    </td>
  );
}

function TeamRow({
  team,
  columns,
  showHitsErrors,
  dim,
  currentPeriod,
}: {
  team: MatchTeam;
  columns: string[];
  showHitsErrors: boolean;
  dim: boolean;
  currentPeriod: number | null;
}) {
  return (
    <tr>
      <th
        scope="row"
        className={cn("py-0.5 pr-1 text-left font-medium", dim ? "text-ink-3" : "text-ink")}
      >
        {team.abbreviation}
      </th>
      {columns.map((label, index) => (
        <Cell key={label} dim={dim} current={index === currentPeriod}>
          {team.periods[index] ?? ""}
        </Cell>
      ))}
      {totals(team, showHitsErrors).map((value, index) => (
        <Cell key={index} total divide={index === 0}>
          {value}
        </Cell>
      ))}
    </tr>
  );
}

export function LineScore({ match }: { match: Match }) {
  const length = Math.max(match.away.periods.length, match.home.periods.length);
  if (length === 0) return null;

  const columns = Array.from({ length }, (_, index) => `${index + 1}`);
  const showHitsErrors = match.away.hits != null || match.home.hits != null;
  const totalLabels = showHitsErrors ? ["R", "H", "E"] : ["T"];
  const finished = match.state === "post";
  const currentPeriod = match.state === "in" ? length - 1 : null;

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="text-micro w-full border-collapse">
        <thead>
          <tr className="text-ink-4 border-border/50 border-b">
            <th scope="col" className="sr-only">
              Team
            </th>
            {columns.map((label, index) => (
              <th
                key={label}
                scope="col"
                className={cn(
                  "px-1 py-0.5 text-center font-normal",
                  index === currentPeriod && "text-ink font-medium",
                )}
              >
                {label}
              </th>
            ))}
            {totalLabels.map((label, index) => (
              <th
                key={label}
                scope="col"
                className={cn(
                  "text-ink-3 px-1 py-0.5 text-center font-medium",
                  index === 0 && "border-border/60 border-l",
                )}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <TeamRow
            team={match.away}
            columns={columns}
            showHitsErrors={showHitsErrors}
            dim={finished && !match.away.winner}
            currentPeriod={currentPeriod}
          />
          <TeamRow
            team={match.home}
            columns={columns}
            showHitsErrors={showHitsErrors}
            dim={finished && !match.home.winner}
            currentPeriod={currentPeriod}
          />
        </tbody>
      </table>
    </div>
  );
}
