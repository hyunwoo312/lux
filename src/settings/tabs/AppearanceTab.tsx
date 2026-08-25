import { Switch } from "@/components/ui/switch";
import { ConfigSegmented, ConfigSelect } from "@/components/config/WidgetConfig";
import { AccentPicker } from "@/settings/components/AccentPicker";
import { WallpaperSetting } from "@/settings/components/WallpaperSetting";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import type { ClockDateFormat } from "@/lib/clock";
import { useThemeStore } from "@/stores/useThemeStore";
import type { ThemeMode } from "@/lib/theme";

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
    <div className="flex flex-col gap-6">
      <SettingsSection title="Theme">
        <SettingsRow
          title="Light or dark"
          description="Follow your system setting, or pick one."
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
        </SettingsRow>
        <SettingsRow
          title="Accent"
          description="The highlight colour used across Lux."
          control={<AccentPicker />}
        />
      </SettingsSection>

      <SettingsSection title="Wallpaper">
        <WallpaperSetting />
      </SettingsSection>

      <SettingsSection title="Dashboard">
        <SettingsRow
          title="Grid lines"
          description="Always show the dashboard grid, not only while editing."
          control={<Switch checked={showGridLines} onCheckedChange={setShowGridLines} />}
        />
        <SettingsRow
          title="Clock"
          description="Show the time in the header."
          control={<Switch checked={showClock} onCheckedChange={setShowClock} />}
        />
        <SettingsRow
          title="24-hour time"
          description="Use a 24-hour clock instead of AM/PM."
          control={<Switch checked={clock24h} onCheckedChange={setClock24h} />}
        />
        <SettingsRow
          title="Date under the clock"
          description="Add the weekday, the date, or both."
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
      </SettingsSection>
    </div>
  );
}
