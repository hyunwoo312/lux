import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { getGreetingCopy } from "@/app/greeting";
import { getLocal, setLocal } from "@/lib/local-store";
import { useDashboardStore } from "@/stores/useDashboardStore";

const GREETING_SUBTITLE_KEY = "lux.greeting.lastSubtitle";

export function Header() {
  const [greeting] = useState(() =>
    getGreetingCopy(new Date(), Math.random, getLocal(GREETING_SUBTITLE_KEY)),
  );
  const editing = useDashboardStore((s) => s.editing);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const toggleEditing = useDashboardStore((s) => s.toggleEditing);

  useEffect(() => {
    setLocal(GREETING_SUBTITLE_KEY, greeting.subtitle);
  }, [greeting.subtitle]);

  return (
    <header className="flex flex-col gap-3">
      <h1
        className="
          font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-none font-medium tracking-tight
        "
      >
        {greeting.title}
      </h1>
      <div className="flex items-center justify-between gap-6">
        <p
          className="
            text-muted-foreground max-w-[52ch] text-xs font-semibold tracking-[0.15em] uppercase
          "
        >
          {greeting.subtitle}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="size-10 [&_svg]:size-5"
            aria-label="Add widget"
            onClick={() => addWidget("clock")}
          >
            <Plus />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-10 [&_svg]:size-5", editing && "bg-accent text-foreground")}
            aria-label={editing ? "Done editing layout" : "Edit layout"}
            onClick={toggleEditing}
          >
            <span className="relative grid size-5 place-items-center">
              <Pencil
                className={cn(
                  "absolute transition-all duration-300 ease-out",
                  editing ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
                )}
              />
              <Check
                className={cn(
                  "absolute transition-all duration-300 ease-out",
                  editing ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0",
                )}
              />
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 [&_svg]:size-5"
            aria-label="Settings"
          >
            <Settings />
          </Button>
        </div>
      </div>
    </header>
  );
}
