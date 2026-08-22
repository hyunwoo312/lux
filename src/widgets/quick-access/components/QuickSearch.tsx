import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function QuickSearch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="relative shrink-0 px-0.5 pb-1.5">
      <Search
        className="text-ink-3 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className="[&::-webkit-search-cancel-button]:hidden px-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="
            press focus-ring text-ink-3 absolute top-1/2 right-2 flex size-6 -translate-y-1/2
            cursor-pointer items-center justify-center rounded-sm
            hover:text-ink
          "
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
