import { createContext, useContext } from "react";

type WidgetChrome = {
  title: string;
  active?: boolean;
  openConfig: () => void;
};

export const WidgetChromeContext = createContext<WidgetChrome>({
  title: "",
  openConfig: () => {},
});

export function useWidgetChrome(): WidgetChrome {
  return useContext(WidgetChromeContext);
}
