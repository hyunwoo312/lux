import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";

export function Field({
  label,
  htmlFor,
  labelId,
  children,
}: {
  label: string;
  htmlFor?: string;
  labelId?: string;
  children: ReactNode;
}) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className="flex flex-col gap-3">
      <Tag
        {...(htmlFor ? { htmlFor } : {})}
        {...(labelId ? { id: labelId } : {})}
        className={cn(TYPE.eyebrow, "self-start")}
      >
        {label}
      </Tag>
      {children}
    </div>
  );
}
