import type { ReactNode } from "react";
import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function WidgetConfig({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>;
}

export function WidgetConfigGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <span className="
        text-muted-foreground/70 text-[0.65rem] font-semibold tracking-wider uppercase
      ">
        {label}
      </span>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

type ConfigItemProps = {
  title: string;
  description?: string;
  control?: ReactNode;
  children?: ReactNode;
};

function ConfigText({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm leading-none font-medium">{title}</span>
      {description && (
        <span className="text-muted-foreground text-xs leading-snug">{description}</span>
      )}
    </div>
  );
}

export function WidgetConfigItem({ title, description, control, children }: ConfigItemProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <ConfigText title={title} description={description} />
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children}
    </div>
  );
}

type ConfigSubItemProps = ConfigItemProps & { disabled?: boolean };

export function WidgetConfigSubItem({
  title,
  description,
  control,
  disabled = false,
}: ConfigSubItemProps) {
  return (
    <div
      className={cn(
        `
          border-border/70 ml-1 flex items-center justify-between gap-4 border-l pl-3
          transition-opacity
        `,
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <ConfigText title={title} description={description} />
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

type SegmentedOption<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
};

export function ConfigSegmented<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  label,
}: SegmentedProps<T>) {
  const layoutId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="bg-foreground/[0.06] inline-flex gap-0.5 rounded-md p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={disabled ? -1 : 0}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
                className="bg-primary absolute inset-0 rounded-sm"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

