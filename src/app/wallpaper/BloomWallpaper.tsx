const BLOBS = [
  { hue: 0, origin: "center center", animation: "wp-move-vertical 30s alternate", opacity: 1 },
  { hue: -70, origin: "calc(50% - 400px)", animation: "wp-move-circle 20s reverse", opacity: 0.9 },
  { hue: 45, origin: "calc(50% + 400px)", animation: "wp-move-circle 40s normal", opacity: 0.9 },
  {
    hue: -35,
    origin: "calc(50% - 200px)",
    animation: "wp-move-horizontal 40s alternate",
    opacity: 0.7,
  },
  {
    hue: 80,
    origin: "calc(50% - 800px) calc(50% + 800px)",
    animation: "wp-move-circle 25s normal",
    opacity: 0.9,
  },
] as const;

export function BloomWallpaper({ intensity, speed }: { intensity: number; speed: number }) {
  const scale = 1.6 - speed;

  return (
    <div className="absolute inset-0" style={{ opacity: 0.35 + intensity * 0.65 }}>
      <svg aria-hidden className="hidden">
        <defs>
          <filter id="wp-goo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0 [filter:url(#wp-goo)_blur(40px)]">
        {BLOBS.map((blob, index) => {
          const [name, seconds, direction] = blob.animation.split(" ");
          return (
            <div
              key={index}
              className="wp-blob"
              style={{
                background:
                  "radial-gradient(circle at center, var(--bloom) 0%, transparent 50%) no-repeat",
                filter: `hue-rotate(${blob.hue}deg)`,
                transformOrigin: blob.origin,
                opacity: blob.opacity,
                animationName: name,
                animationDuration: `${Number(seconds?.replace("s", "")) * scale}s`,
                animationDirection: direction,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
