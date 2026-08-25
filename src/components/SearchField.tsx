import type { KeyboardEvent as ReactKeyboardEvent, Ref } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FieldSize = "sm" | "md";

const SIZES: Record<FieldSize, { icon: string; input: string; clear: string; cross: string }> = {
  sm: {
    icon: "text-ink-3 size-3.5",
    input: "text-caption",
    clear: "text-ink-3 right-2.5 size-5 rounded-xs",
    cross: "size-3.5",
  },
  md: {
    icon: "text-ink-3 size-4",
    input: "text-body",
    clear: "text-ink-3 right-2 size-6 rounded-sm",
    cross: "size-4",
  },
};

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  size?: FieldSize;
  onFocus?: () => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  ref?: Ref<HTMLInputElement>;
};

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  size = "md",
  onFocus,
  onKeyDown,
  className,
  ref,
}: SearchFieldProps) {
  const styles = SIZES[size];

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value.length > 0) {
      event.preventDefault();
      onChange("");
      return;
    }
    onKeyDown?.(event);
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2",
          styles.icon,
        )}
      />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        aria-label={label}
        placeholder={placeholder ?? label}
        autoComplete="off"
        spellCheck={false}
        className={cn("[&::-webkit-search-cancel-button]:hidden px-8", styles.input)}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={cn(
            `
              press focus-ring absolute top-1/2 grid -translate-y-1/2 cursor-pointer
              place-items-center
              hover:text-ink
            `,
            styles.clear,
          )}
        >
          <X className={styles.cross} aria-hidden />
        </button>
      )}
    </div>
  );
}
