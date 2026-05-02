import { useEffect, useState } from "react";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <span className="font-display text-4xl font-medium tabular-nums">
        {timeFormat.format(now)}
      </span>
    </div>
  );
}
