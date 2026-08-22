import type { FormEvent } from "react";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const FIELD = "[&::-webkit-search-cancel-button]:hidden px-8";
const CLEAR = `
  press focus-ring text-ink-3 absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2
  cursor-pointer items-center justify-center rounded-sm
  hover:text-ink
`;

function SearchIcon() {
  return (
    <Search
      className="text-ink-3 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      aria-hidden
    />
  );
}

export function HeadlineFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative shrink-0">
      <SearchIcon />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Filter headlines and sources…"
        aria-label="Filter headlines and sources"
        className={FIELD}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear filter"
          className={CLEAR}
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function GoogleSearch({ query }: { query: string }) {
  const instanceId = useWidgetInstanceId();
  const setGoogleQuery = useNewsStore((s) => s.setGoogleQuery);
  const [value, setValue] = useState(query);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setGoogleQuery(instanceId, value.trim());
  };

  const clear = () => {
    setValue("");
    setGoogleQuery(instanceId, "");
  };

  return (
    <form onSubmit={submit} className="relative shrink-0">
      <SearchIcon />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search Google News…"
        aria-label="Search Google News"
        className={FIELD}
      />
      {query && (
        <button type="button" onClick={clear} aria-label="Clear search" className={CLEAR}>
          <X className="size-4" aria-hidden />
        </button>
      )}
    </form>
  );
}
