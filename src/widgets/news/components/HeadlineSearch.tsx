import type { FormEvent } from "react";
import { useState } from "react";
import { SearchField } from "@/components/SearchField";
import { useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function GoogleSearch({ query }: { query: string }) {
  const instanceId = useWidgetInstanceId();
  const setGoogleQuery = useNewsStore((s) => s.setGoogleQuery);
  const [value, setValue] = useState(query);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setGoogleQuery(instanceId, value.trim());
  };

  const change = (next: string) => {
    setValue(next);
    if (next.length === 0) setGoogleQuery(instanceId, "");
  };

  return (
    <form onSubmit={submit} className="shrink-0">
      <SearchField value={value} onChange={change} label="Search Google News" />
    </form>
  );
}
