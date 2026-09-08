import { ChevronLeft } from "lucide-react";

export function HeaderBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        press focus-ring text-ink-3
        hover:text-ink
        inline-flex cursor-pointer items-center gap-0.5 text-caption font-medium tracking-wide
        uppercase
      "
    >
      <ChevronLeft className="size-4" aria-hidden />
      {label}
    </button>
  );
}
