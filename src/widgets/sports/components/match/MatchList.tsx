import { motion, useReducedMotion } from "motion/react";
import { listVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { IdleTeamRow, MatchRow } from "@/widgets/sports/components/match/MatchRow";
import { CollapsibleSection } from "@/widgets/sports/components/SportsSection";
import { groupMatches } from "@/widgets/sports/lib/grouping";
import type { Sport } from "@/widgets/sports/lib/leagues";
import type { Match } from "@/widgets/sports/types";

export function MatchList({
  label,
  sport,
  matches,
  idle,
  now,
  hour12,
  followed,
  indent = false,
  className,
}: {
  label: string;
  sport: Sport;
  matches: Match[];
  idle?: string[];
  now: number;
  hour12: boolean;
  followed?: readonly string[];
  indent?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const sections = groupMatches(matches);

  return (
    <motion.div
      variants={listVariants(reduced)}
      initial="hidden"
      animate="show"
      className={cn("flex flex-col gap-2", className)}
    >
      {sections.map((section) => (
        <CollapsibleSection
          key={section.id}
          label={section.label}
          count={section.matches.length}
          indent={indent}
        >
          <ul aria-label={`${section.label} — ${label}`} className="flex flex-col gap-0.5 px-1">
            {section.matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                sport={sport}
                now={now}
                hour12={hour12}
                followed={followed}
              />
            ))}
          </ul>
        </CollapsibleSection>
      ))}
      {(idle?.length ?? 0) > 0 && (
        <CollapsibleSection label="Not playing" count={idle?.length ?? 0} indent={indent}>
          <ul aria-label={`Not playing — ${label}`} className="flex flex-col gap-0.5 px-1">
            {idle?.map((abbreviation) => (
              <IdleTeamRow key={abbreviation} abbreviation={abbreviation} />
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </motion.div>
  );
}
