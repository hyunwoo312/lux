export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function progressLabels(
  displayedProgressMs: number,
  durationMs: number,
  mode: "total" | "remaining",
): { leftLabel: string; rightLabel: string } {
  return {
    leftLabel: formatDuration(displayedProgressMs),
    rightLabel:
      mode === "remaining"
        ? `-${formatDuration(Math.max(0, durationMs - displayedProgressMs))}`
        : formatDuration(durationMs),
  };
}
