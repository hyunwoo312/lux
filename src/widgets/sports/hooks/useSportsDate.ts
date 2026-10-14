import { useNow } from "@/hooks/useNow";
import { useSportsView } from "@/widgets/sports/useSportsViewStore";

export function useSportsDate(): Date {
  const date = useSportsView((view) => view.date);
  const now = useNow();
  return date ? new Date(`${date}T12:00:00`) : now;
}
