import type { LucideIcon } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";

type CalendarEmptyProps = {
  icon: LucideIcon;
  children: string;
};

export function CalendarEmpty({ icon: Icon, children }: CalendarEmptyProps) {
  return <StateMessage icon={Icon} message={children} />;
}
