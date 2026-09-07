import type { ReactNode } from "react";
import { StateMessage } from "@/components/StateMessage";

export function ListboxStatus({ children }: { children: ReactNode }) {
  return <StateMessage compact message={children} />;
}
