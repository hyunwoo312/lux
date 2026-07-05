import { useEffect, useState } from "react";

export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const tick = () => setNow(new Date());
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, intervalMs);
    }, intervalMs - (Date.now() % intervalMs));
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [intervalMs]);

  return now;
}
