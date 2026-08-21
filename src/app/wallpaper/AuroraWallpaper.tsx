import type { CSSProperties } from "react";

const SLOWEST_S = 180;
const FASTEST_S = 60;

export function AuroraWallpaper({ intensity, speed }: { intensity: number; speed: number }) {
  const duration = SLOWEST_S - (SLOWEST_S - FASTEST_S) * speed;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="wp-aurora"
        style={
          {
            opacity: 0.25 + intensity * 0.5,
            "--aurora-duration": `${Math.round(duration)}s`,
          } as CSSProperties
        }
      />
    </div>
  );
}
