import { useEffect, useState } from "react";

type Hydratable = {
  persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void };
};

export function useHydrated(store: Hydratable): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store, hydrated]);

  return hydrated;
}
