import type { ComponentType, SVGProps } from "react";

type IconProps = { className?: string };

function icon(paths: string[]): ComponentType<IconProps> {
  const base: SVGProps<SVGSVGElement> = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  return function SportIcon({ className }: IconProps) {
    return (
      <svg {...base} className={className} aria-hidden focusable="false">
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
}

export const SoccerIcon = icon([
  "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  "M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55l4.76 -3.45",
  "M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45",
]);

export const BasketballIcon = icon([
  "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  "M5.65 5.65l12.7 12.7",
  "M5.65 18.35l12.7 -12.7",
  "M12 3a9 9 0 0 0 9 9",
  "M3 12a9 9 0 0 1 9 9",
]);

export const BaseballIcon = icon([
  "M5.636 18.364a9 9 0 1 0 12.728 -12.728a9 9 0 0 0 -12.728 12.728",
  "M12.495 3.02a9 9 0 0 1 -9.475 9.475",
  "M20.98 11.505a9 9 0 0 0 -9.475 9.475",
  "M9 9l2 2",
  "M13 13l2 2",
  "M11 7l2 1",
  "M7 11l1 2",
  "M16 11l1 2",
]);

export const FootballIcon = icon([
  "M15 9l-6 6",
  "M10 12l2 2",
  "M12 10l2 2",
  "M8 21a5 5 0 0 0 -5 -5",
  "M16 3c-7.18 0 -13 5.82 -13 13a5 5 0 0 0 5 5c7.18 0 13 -5.82 13 -13a5 5 0 0 0 -5 -5",
  "M16 3a5 5 0 0 0 5 5",
]);

export const GolfIcon = icon([
  "M12 18v-15l7 4l-7 4",
  "M9 17.67c-.62 .36 -1 .82 -1 1.33c0 1.1 1.8 2 4 2s4 -.9 4 -2c0 -.5 -.38 -.97 -1 -1.33",
]);

export const HockeyIcon = icon([
  "M5.905 5h3.418a1 1 0 0 1 .928 .629l1.143 2.856a3 3 0 0 0 2.207 1.83l4.717 .926a2.084 2.084 0 0 1 1.682 2.045v.714a1 1 0 0 1 -1 1h-13.895a1 1 0 0 1 -1 -1.1l.8 -8a1 1 0 0 1 1 -.9",
  "M3 19h17a1 1 0 0 0 1 -1",
  "M9 15v4",
  "M15 15v4",
]);

export const TennisIcon = icon([
  "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  "M5.65 5.65a9 9 0 0 0 0 12.7",
  "M18.35 5.65a9 9 0 0 1 0 12.7",
]);
