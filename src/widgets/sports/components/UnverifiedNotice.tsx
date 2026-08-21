import { TriangleAlert } from "lucide-react";

export function UnverifiedNotice({ label }: { label: string }) {
  return (
    <p
      role="note"
      className="
        text-warning bg-warning/10 text-micro flex shrink-0 items-center gap-1.5 rounded-md px-2
        py-1
      "
    >
      <TriangleAlert className="size-3 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">{label} live detail is unconfirmed off-season</span>
    </p>
  );
}
