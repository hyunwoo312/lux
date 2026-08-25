import { cn } from "@/lib/utils";

export function TeamForm({ form, side }: { form: string; side: "home" | "away" }) {
  const results = [...form].slice(-5);

  return (
    <span
      className={cn("flex items-center gap-0.5", side === "away" ? "justify-end" : "justify-start")}
    >
      <span className="sr-only">Recent form: {results.join(", ")}</span>
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          aria-hidden
          className={cn(
            "bg-foreground/8 grid size-3 place-items-center rounded-xs text-[0.5rem] leading-none",
            result === "W" ? "text-ink font-semibold" : "text-ink-3",
          )}
        >
          {result}
        </span>
      ))}
    </span>
  );
}
