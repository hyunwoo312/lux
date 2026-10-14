export const TEAM_STATS: Record<string, [string, string][]> = {
  nba: [
    ["fieldGoalPct", "Field goals %"],
    ["fieldGoalsMade-fieldGoalsAttempted", "Field goals"],
    ["threePointFieldGoalPct", "Three pointers %"],
    ["threePointFieldGoalsMade-threePointFieldGoalsAttempted", "Three pointers"],
    ["freeThrowPct", "Free throws %"],
    ["freeThrowsMade-freeThrowsAttempted", "Free throws"],
    ["totalRebounds", "Rebounds"],
    ["assists", "Assists"],
    ["totalTurnovers", "Turnovers"],
    ["steals", "Steals"],
    ["blocks", "Blocks"],
    ["pointsInPaint", "Points in paint"],
  ],
  nfl: [
    ["totalYards", "Total yards"],
    ["netPassingYards", "Passing yards"],
    ["rushingYards", "Rushing yards"],
    ["firstDowns", "First downs"],
    ["thirdDownEff", "Third downs"],
    ["fourthDownEff", "Fourth downs"],
    ["turnovers", "Turnovers"],
    ["totalPenaltiesYards", "Penalties / yards"],
    ["possessionTime", "Possession"],
    ["redZoneAttempts", "Red zone"],
  ],
};
export const SEASON_STATS: Record<string, [string, string][]> = {
  nba: [
    ["streak", "Streak"],
    ["avgPointsAgainst", "Points allowed / game"],
    ["Last Ten Games", "Last ten"],
  ],
  nfl: [
    ["totalPointsPerGame", "Points / game"],
    ["yardsPerGame", "Yards / game"],
    ["passingYardsPerGame", "Passing yards / game"],
    ["rushingYardsPerGame", "Rushing yards / game"],
    ["totalPointsPerGameAllowed", "Points allowed / game"],
    ["yardsPerGameAllowed", "Yards allowed / game"],
  ],
};
