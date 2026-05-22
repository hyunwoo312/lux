import { createContext, useContext } from "react";

type WidgetChrome = {
  openConfig: () => void;
};

export const WidgetChromeContext = createContext<WidgetChrome>({ openConfig: () => {} });

export function useWidgetChrome(): WidgetChrome {
  return useContext(WidgetChromeContext);
}
