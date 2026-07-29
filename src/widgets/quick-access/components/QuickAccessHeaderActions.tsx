import { OpenAllPinsButton } from "@/widgets/quick-access/components/OpenAllPinsButton";
import { QuickAccessLayoutToggle } from "@/widgets/quick-access/components/QuickAccessLayoutToggle";

export function QuickAccessHeaderActions() {
  return (
    <div className="flex items-center gap-0.5">
      <OpenAllPinsButton />
      <QuickAccessLayoutToggle />
    </div>
  );
}
