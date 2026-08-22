import { TYPE } from "@/lib/type";

type AgendaDayHeadingProps = {
  label: string;
  gutter: number;
};

export function AgendaDayHeading({ label, gutter }: AgendaDayHeadingProps) {
  return (
    <h3
      style={{ paddingLeft: gutter }}
      className="sticky top-0 z-30 flex items-center gap-2 pt-3 pb-1"
    >
      <span className={TYPE.eyebrow}>{label}</span>
      <span aria-hidden className="bg-foreground/8 h-px flex-1" />
    </h3>
  );
}
