import { GRADIENT_SETS, type GradientStyle } from "@/app/wallpaper/shapes";

export function GradientWallpaper({
  style,
  intensity,
}: {
  style: GradientStyle;
  intensity: number;
}) {
  return (
    <div className="absolute inset-0" style={{ opacity: 0.35 + intensity * 0.65 }}>
      {style === "still" && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, transparent 40%, color-mix(in oklab, var(--background) 70%, transparent) 100%)",
          }}
        />
      )}
      {GRADIENT_SETS[style].map((blob, index) => (
        <div
          key={`${style}-${index}`}
          className="wp-layer"
          style={{
            background: `radial-gradient(circle at ${blob.x}% ${blob.y}%, var(--bloom) 0%, transparent ${blob.size}%)`,
            filter: `hue-rotate(${blob.hue}deg) blur(24px)`,
            opacity: 0.42,
            animationName: blob.drift || undefined,
            animationDuration: blob.duration ? `${blob.duration}s` : undefined,
            animationDelay: blob.duration ? `-${index * 5}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
