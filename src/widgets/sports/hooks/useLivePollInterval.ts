import { useEffect, useState } from "react";

export const IDLE_POLL_MS = 15 * 60_000;
export const LIVE_POLL_STEPS_MS = [15_000, 30_000, 60_000] as const;
export const LIVE_STEP_AFTER_MS = [5 * 60_000, 15 * 60_000] as const;

export function useLivePollInterval(
  anyLive: boolean,
  floorMs: number = LIVE_POLL_STEPS_MS[0],
): number {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!anyLive) {
      setStep(0);
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];

    const restart = () => {
      for (const timer of timers) clearTimeout(timer);
      setStep(0);
      timers = LIVE_STEP_AFTER_MS.map((afterMs, index) =>
        setTimeout(() => setStep(index + 1), afterMs),
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") restart();
    };

    restart();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      for (const timer of timers) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [anyLive]);

  if (!anyLive) return IDLE_POLL_MS;
  return Math.max(floorMs, LIVE_POLL_STEPS_MS[step] ?? LIVE_POLL_STEPS_MS[0]);
}
