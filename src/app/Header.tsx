import { useState } from "react";
import { Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getGreetingCopy } from "@/app/greeting";

export function Header() {
  const [greeting] = useState(() => getGreetingCopy());

  return (
    <header className="flex flex-col gap-3">
      <h1 className="
        font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-none font-medium tracking-tight
      ">
        {greeting.title}
      </h1>
      <div className="flex items-center justify-between gap-6">
        <p className="
          text-muted-foreground max-w-[52ch] text-xs font-semibold tracking-[0.15em] uppercase
        ">
          {greeting.subtitle}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="size-10 [&_svg]:size-5" aria-label="Search">
            <Search />
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
