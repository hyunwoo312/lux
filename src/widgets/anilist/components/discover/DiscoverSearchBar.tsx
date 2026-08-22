import { Search, X } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Input } from "@/components/ui/input";

type DiscoverSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  kind: "anime" | "manga";
};

export function DiscoverSearchBar({ value, onChange, kind }: DiscoverSearchBarProps) {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value.length > 0) {
      event.preventDefault();
      onChange("");
    }
  };

  return (
    <div className="relative px-1">
      <Search
        aria-hidden
        className="
          text-ink-4 pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2
        "
      />
      <Input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={`Search ${kind}`}
        placeholder={`Search ${kind}…`}
        autoComplete="off"
        spellCheck={false}
        className="pr-8 pl-8 text-caption"
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="
            press focus-ring text-ink-4
            hover:text-ink
            absolute top-1/2 right-2.5 grid size-5 -translate-y-1/2 cursor-pointer
            place-items-center rounded-xs
          "
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
