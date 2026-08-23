import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SportsSearch({
  value,
  onChange,
  onFocus,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  label: string;
  placeholder: string;
}) {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value.length > 0) {
      event.preventDefault();
      onChange("");
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
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
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        aria-label={label}
        placeholder={placeholder}
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
