import { useEffect, useState } from "react";

type PersistedStore = {
  persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void };
};

export function usePersistHydrated(store: PersistedStore): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store, hydrated]);

  return hydrated;
}
