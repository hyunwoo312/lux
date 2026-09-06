import { createContext, useContext } from "react";

export const WidgetInstanceContext = createContext<string | null>(null);

export function useWidgetInstanceId(): string {
  const id = useContext(WidgetInstanceContext);
  if (id === null) {
    throw new Error("useWidgetInstanceId must be used within a widget instance");
  }
  return id;
}

export function createInstanceSelector<Data extends object>(
  useStore: <T>(selector: (state: { byInstance: Record<string, Data> }) => T) => T,
  fallback: Data | (() => Data),
): <T>(selector: (data: Data) => T) => T {
  return function useInstanceData<T>(selector: (data: Data) => T): T {
    const id = useWidgetInstanceId();
    return useStore((state) =>
      selector(state.byInstance[id] ?? (typeof fallback === "function" ? fallback() : fallback)),
    );
  };
}
