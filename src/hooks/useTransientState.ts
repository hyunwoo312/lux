import { useCallback, useEffect, useRef, useState } from "react";

export function useTransientState<T>(
  idle: T,
  ms: number,
): [T, (next: T) => void, (next: T) => void] {
  const [value, setValue] = useState(idle);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const hold = useCallback((next: T) => {
    window.clearTimeout(timer.current);
    setValue(next);
  }, []);

  const flash = useCallback(
    (next: T) => {
      hold(next);
      timer.current = window.setTimeout(() => setValue(idle), ms);
    },
    [hold, idle, ms],
  );

  return [value, flash, hold];
}
