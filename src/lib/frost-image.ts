import { createContext, useContext } from "react";

const FrostImageContext = createContext<string | null>(null);

export const FrostImageProvider = FrostImageContext.Provider;

export function useFrostImage(): string | null {
  return useContext(FrostImageContext);
}
