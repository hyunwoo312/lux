import { createContext, useContext } from "react";

type WidgetChrome = {
  title: string;
  openConfig: () => void;
};

export const WidgetChromeContext = createContext<WidgetChrome>({
  title: "",
  openConfig: () => {},
});

export function useWidgetChrome(): WidgetChrome {
  return useContext(WidgetChromeContext);
}
