import { useEffect, useRef, useState } from "react";

export const FLASH_MS = 1400;

export function useChangeFlash(
  value: string | number | null | undefined,
  active: boolean,
): boolean {
  const previous = useRef(value);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    if (!active) return;

    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), FLASH_MS);
    return () => clearTimeout(timer);
  }, [value, active]);

  return flashing && active;
}
