import { useEffect, useState } from "react";
import { boardWidth } from "@/widgets/core/grid";

export function useBoardWidth(): number {
  const [width, setWidth] = useState(() => boardWidth(window.innerWidth));

  useEffect(() => {
    const measure = () => setWidth(boardWidth(window.innerWidth));
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return width;
}
