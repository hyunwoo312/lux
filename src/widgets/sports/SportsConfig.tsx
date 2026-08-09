import {
  ConfigMultiToggle,
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { TeamPicker } from "@/widgets/sports/components/TeamPicker";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";
import type { DayWindow } from "@/widgets/sports/lib/window";
import type { MatchState } from "@/widgets/sports/types";

const STATE_OPTIONS: { value: MatchState; label: string }[] = [
  { value: "in", label: "Live" },
  { value: "pre", label: "Upcoming" },
  { value: "post", label: "Final" },
];

const WINDOW_OPTIONS: { value: DayWindow; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "day", label: "± 1 day" },
  { value: "week", label: "± 3 days" },
];

export function SportsConfig() {
  const instanceId = useWidgetInstanceId();
  const states = useSports((d) => d.states);
  const dayWindow = useSports((d) => d.window);
  const setStates = useSportsStore((s) => s.setStates);
  const setWindow = useSportsStore((s) => s.setWindow);

  return (
    <>
      <WidgetConfigGroup label="Scores">
        <WidgetConfigItem
          title="Teams"
          description="Follow specific teams, or leave empty for the whole league"
          control={<span />}
        >
          <TeamPicker />
        </WidgetConfigItem>

        <WidgetConfigItem
          title="Show"
          description="Which games appear in the list"
          control={
            <ConfigMultiToggle
              label="Game states"
              values={states}
              options={STATE_OPTIONS}
              onChange={(next) => setStates(instanceId, next)}
            />
          }
        />

        <WidgetConfigItem
          title="Days"
          description="A wider range slows live updates to keep data use steady"
          control={
            <ConfigSegmented
              label="Day range"
              value={dayWindow}
              options={WINDOW_OPTIONS}
              onChange={(next) => setWindow(instanceId, next)}
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="About">
        <WidgetConfigItem
          title="Scores"
          description="Live and final scores from ESPN; may be delayed"
          control={
            <a
              href="https://www.espn.com/"
              target="_blank"
              rel="noreferrer"
              className="
                text-muted-foreground
                hover:text-foreground
                text-xs underline underline-offset-2
              "
            >
              ESPN
            </a>
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
