import { MESH_DRIFTS, MESH_POLYGONS } from "@/app/wallpaper/shapes";

export function MeshWallpaper({ intensity, density }: { intensity: number; density: number }) {
  const shown = MESH_POLYGONS.slice(0, Math.max(3, Math.round(MESH_POLYGONS.length * density)));
  return (
    <>
      <svg
        aria-hidden
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1000 1000"
        style={{ opacity: 0.35 + intensity * 0.45, filter: "blur(28px)" }}
      >
        {shown.map((points, index) => (
          <polygon
            key={`glow-${points}`}
            points={points}
            style={{
              fill: "var(--bloom)",
              fillOpacity: 0.16 * intensity,
              stroke: "var(--bloom)",
              strokeOpacity: 0.3 * intensity,
              strokeWidth: 14,
              filter: `hue-rotate(${((index % 5) - 2) * 22}deg)`,
            }}
          />
        ))}
      </svg>
      <svg
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1000 1000"
        style={{ opacity: 0.25 + intensity * 0.6 }}
      >
        {shown.map((points, index) => (
          <polygon
            key={points}
            className="mesh-poly"
            points={points}
            style={{
              stroke: "var(--bloom)",
              strokeOpacity: 0.3 + ((index % 4) * 0.1 + 0.1) * intensity,
              strokeWidth: 1.75,
              fill: "var(--bloom)",
              fillOpacity: 0.03 * intensity,
              filter: `hue-rotate(${((index % 5) - 2) * 22}deg)`,
              animationName: MESH_DRIFTS[index % MESH_DRIFTS.length],
              animationDuration: `${30 + (index % 6) * 3}s`,
              animationDelay: `-${index * 3}s`,
            }}
          />
        ))}
      </svg>
    </>
  );
}
