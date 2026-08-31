import { useEffect, useState } from "react";

function active(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && document.hasFocus();
}

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    const update = () => setVisible(active());
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, []);

  return visible;
}
