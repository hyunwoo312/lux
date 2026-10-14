import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ConfigSelect } from "@/components/config/Config";
import { cn } from "@/lib/utils";
import type { GamePlayerGroup } from "@/widgets/sports/types";

export function GamePlayers({ groups }: { groups: GamePlayerGroup[] }) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [expanded, setExpanded] = useState<string | null>(null);
  const group = groups.find((group) => group.id === groupId) ?? groups[0];
  if (!group) return null;
  const preferred = ["PTS", "REB", "AST", "YDS", "TD", "INT", "REC", "CAR"];
  const featured = preferred
    .flatMap((label) => group.columns.find((column) => column.label === label) ?? [])
    .slice(0, 3);
  const columns = featured.length ? featured : group.columns.slice(0, 3);
  return (
    <div className="flex flex-col gap-2">
      <ConfigSelect
        label="Player group"
        value={group.id}
        options={groups.map((group) => ({
          value: group.id,
          label: `${group.team} · ${group.category}`,
        }))}
        onChange={(id) => {
          setGroupId(id);
          setExpanded(null);
        }}
        triggerClassName="w-full"
        contentClassName="w-64"
      />
      <div className="text-ink-3 text-micro flex items-center gap-2 px-2">
        <span className="flex-1">Player</span>
        {columns.map((column) => (
          <span key={column.key} className="w-9 text-right">
            {column.label}
          </span>
        ))}
        <span className="w-3" />
      </div>
      <ul className="flex flex-col gap-0.5">
        {group.players.map((player) => (
          <li key={player.id}>
            <button
              type="button"
              aria-expanded={expanded === player.id}
              aria-label={`Details for ${player.name}`}
              onClick={() => setExpanded(expanded === player.id ? null : player.id)}
              className="
                press-row focus-ring
                hover:bg-foreground/5
                text-caption flex w-full items-center gap-2 rounded-md px-2 py-2 text-left
              "
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                {player.name}
                {player.starter && <span className="sr-only">, starter</span>}
              </span>
              {player.unavailable ? (
                <span className="text-ink-3 text-micro shrink-0">Did not play</span>
              ) : (
                columns.map((column) => (
                  <span key={column.key} className="w-9 shrink-0 text-right tabular-nums">
                    {player.values[column.key] ?? "—"}
                  </span>
                ))
              )}
              <ChevronDown
                aria-hidden
                className={cn(
                  "text-ink-3 size-3 shrink-0 transition-transform",
                  expanded === player.id && "rotate-180",
                )}
              />
            </button>
            {expanded === player.id && (
              <div className="px-3 py-2">
                <p className="text-caption mb-2 font-medium break-words">{player.name}</p>
                {player.unavailable && (
                  <p className="text-ink-3 text-caption mb-2 break-words">{player.unavailable}</p>
                )}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {group.columns.map((column) => (
                    <div key={column.key} className="text-caption flex justify-between gap-2">
                      <dt className="text-ink-3">{column.label}</dt>
                      <dd className="tabular-nums">
                        {player.unavailable ? "—" : (player.values[column.key] ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
