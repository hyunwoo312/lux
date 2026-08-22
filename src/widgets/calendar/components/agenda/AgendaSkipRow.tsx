import { ChevronsDown } from "lucide-react";

type AgendaSkipRowProps = {
  label: string;
  gutter: number;
};

export function AgendaSkipRow({ label, gutter }: AgendaSkipRowProps) {
  return (
    <li className="flex items-stretch gap-1 py-1.5">
      <span aria-hidden className="flex flex-none justify-end" style={{ width: gutter - 4 }}>
        <span className="border-border/70 min-h-4 border-l border-dashed" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <ChevronsDown aria-hidden className="text-ink-4 size-3 flex-none" />
        <span className="text-ink-4 truncate text-micro font-medium">{label}</span>
        <span aria-hidden className="border-border/70 flex-1 border-t border-dashed" />
      </span>
    </li>
  );
}
