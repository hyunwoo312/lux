import { Switch } from "@/components/ui/switch";
import { AccentPicker } from "@/settings/components/AccentPicker";
import { WallpaperSetting } from "@/settings/components/WallpaperSetting";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import type { ClockDateFormat } from "@/lib/clock";
import { useThemeStore } from "@/stores/useThemeStore";
import type { ThemeMode } from "@/lib/theme";
import {
  ConfigSegmented,
  ConfigSelect,
  ConfigRow,
  ConfigSection,
  ConfigBody,
} from "@/components/config/Config";
import { DASHBOARD, THEME, WALLPAPER } from "@/settings/rows";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const satisfies { value: ThemeMode; label: string }[];

const CLOCK_DATE_OPTIONS = [
  { value: "off", label: "None" },
  { value: "weekday", label: "Weekday" },
  { value: "date", label: "Date" },
  { value: "weekdayDate", label: "Both" },
  { value: "full", label: "With year" },
] as const satisfies { value: ClockDateFormat; label: string }[];

export function AppearanceTab() {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const setClock24h = useAppSettingsStore((s) => s.setClock24h);
  const showClock = useAppSettingsStore((s) => s.showClock);
  const setShowClock = useAppSettingsStore((s) => s.setShowClock);
  const clockDate = useAppSettingsStore((s) => s.clockDate);
  const setClockDate = useAppSettingsStore((s) => s.setClockDate);
  const showGridLines = useAppSettingsStore((s) => s.showGridLines);
  const setShowGridLines = useAppSettingsStore((s) => s.setShowGridLines);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const isThemePersisted = useThemeStore((s) => s.isPersisted);

  return (
    <ConfigBody>
      <ConfigSection title={THEME.title}>
        <ConfigRow
          {...THEME.rows.theme}
          control={
            <ConfigSegmented
              label="Theme"
              value={themeMode}
              options={THEME_OPTIONS}
              onChange={setThemeMode}
            />
          }
        >
          {!isThemePersisted && (
            <p className="text-destructive text-caption">
              Browser storage is full, so this theme won’t be remembered in new tabs.
            </p>
          )}
        </ConfigRow>
        <ConfigRow {...THEME.rows.accent} control={<AccentPicker />} />
      </ConfigSection>

      <ConfigSection title={WALLPAPER.title}>
        <WallpaperSetting />
      </ConfigSection>

      <ConfigSection title={DASHBOARD.title}>
        <ConfigRow
          {...DASHBOARD.rows.gridLines}
          control={<Switch checked={showGridLines} onCheckedChange={setShowGridLines} />}
        />
        <ConfigRow
          {...DASHBOARD.rows.clock}
          control={<Switch checked={showClock} onCheckedChange={setShowClock} />}
        />
        <ConfigRow
          {...DASHBOARD.rows.clock24h}
          control={<Switch checked={clock24h} onCheckedChange={setClock24h} />}
        />
        <ConfigRow
          {...DASHBOARD.rows.clockDate}
          control={
            <ConfigSelect
              label="Date under the clock"
              value={clockDate}
              options={[...CLOCK_DATE_OPTIONS]}
              onChange={setClockDate}
              disabled={!showClock}
            />
          }
        />
      </ConfigSection>
    </ConfigBody>
  );
}
