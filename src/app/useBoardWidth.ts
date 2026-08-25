import { useEffect, useState } from "react";
import { UNIT } from "@/widgets/core/grid";

const SIDE_INSET = 100;

export function quantizeBoardWidth(viewportWidth: number): number {
  return Math.max(UNIT, Math.floor((viewportWidth - SIDE_INSET) / UNIT) * UNIT);
}

export function useBoardWidth(): number {
  const [width, setWidth] = useState(() => quantizeBoardWidth(window.innerWidth));

  useEffect(() => {
    const measure = () => setWidth(quantizeBoardWidth(window.innerWidth));
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return width;
}
