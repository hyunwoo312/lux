import {
  ConfigMultiToggle,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";
import type { MatchState } from "@/widgets/sports/types";

const STATE_OPTIONS: { value: MatchState; label: string }[] = [
  { value: "in", label: "Live" },
  { value: "pre", label: "Upcoming" },
  { value: "post", label: "Final" },
];

export function SportsConfig() {
  const instanceId = useWidgetInstanceId();
  const states = useSports((d) => d.states);
  const setStates = useSportsStore((s) => s.setStates);

  return (
    <>
      <WidgetConfigGroup label="Scores">
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
              className="text-ink-3 hover:text-ink text-caption underline underline-offset-2"
            >
              ESPN
            </a>
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
