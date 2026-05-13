import type { ReactNode } from "react";
import { useId } from "react";
import { motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function WidgetConfig({ children }: { children: ReactNode }) {
  return <div className="@container flex flex-col gap-5">{children}</div>;
}

export function WidgetConfigGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <span className="text-muted-foreground/70 text-2xs font-semibold tracking-wider uppercase">
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
      <div className="
        @3xs:flex-row @3xs:items-center @3xs:justify-between @3xs:gap-4
        flex flex-col gap-2
      ">
        <ConfigText title={title} description={description} />
        {control && <div className="@3xs:shrink-0">{control}</div>}
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
          border-border/70
          @3xs:flex-row @3xs:items-center @3xs:justify-between @3xs:gap-4
          ml-1 flex flex-col gap-2 border-l pl-3 transition-opacity
        `,
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <ConfigText title={title} description={description} />
      {control && <div className="@3xs:shrink-0">{control}</div>}
    </div>
  );
}

type ConfigOption<T extends string> = { value: T; label: string };

type SelectControlProps<T extends string> = {
  value: T;
  options: ConfigOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
};

export function ConfigSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  label,
}: SelectControlProps<T>) {
  const handleChange = (next: string) => {
    const match = options.find((option) => option.value === next);
    if (match) onChange(match.value);
  };
  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className="@3xs:w-36 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type SegmentedProps<T extends string> = {
  value: T;
  options: ConfigOption<T>[];
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
  const handleChange = (next: string) => {
    const match = options.find((option) => option.value === next);
    if (match) onChange(match.value);
  };
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
      aria-label={label}
      className="bg-foreground/[0.06] max-w-full flex-wrap gap-0.5 rounded-md p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(
              "relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
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
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

