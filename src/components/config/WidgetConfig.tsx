import type { ComponentType, ReactNode } from "react";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function WidgetConfig({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 [&>section:first-of-type>:first-child]:hidden">
      {children}
    </div>
  );
}

export function WidgetConfigGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Separator className="mb-1.5" />
      <span className="text-muted-foreground text-2xs font-semibold tracking-wider uppercase">
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
    <div className="flex min-w-0 grow basis-24 flex-col gap-1">
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
          border-border/70 ml-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-l
          pl-3 transition-opacity
        `,
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <ConfigText title={title} description={description} />
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

type ConfigOption<T extends string> = {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

type SelectControlProps<T extends string> = {
  value: T;
  options: ConfigOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
  triggerClassName?: string;
};

export function ConfigSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  label,
  triggerClassName,
}: SelectControlProps<T>) {
  const handleChange = (next: string) => {
    const match = options.find((option) => option.value === next);
    if (match) onChange(match.value);
  };
  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "w-36 max-w-full min-w-0 [&>[data-slot=select-value]]:truncate",
          triggerClassName,
        )}
      >
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

type MultiToggleProps<T extends string> = {
  values: T[];
  options: ConfigOption<T>[];
  onChange: (values: T[]) => void;
  disabled?: boolean;
  maxSelected?: number;
  label: string;
};

export function ConfigMultiToggle<T extends string>({
  values,
  options,
  onChange,
  disabled = false,
  maxSelected,
  label,
}: MultiToggleProps<T>) {
  const atCap = maxSelected !== undefined && values.length >= maxSelected;
  return (
    <ToggleGroup
      type="multiple"
      value={values}
      onValueChange={(next) => onChange(next as T[])}
      disabled={disabled}
      aria-label={label}
      className="flex flex-wrap gap-1"
    >
      {options.map((option) => {
        const active = values.includes(option.value);
        const Icon = option.icon;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            disabled={atCap && !active}
            className={cn(
              `
                inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium
                transition-colors
                disabled:opacity-40
                [&_img]:size-4
                [&_svg]:size-4
              `,
              active
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-accent/60",
            )}
          >
            {Icon && <Icon className="shrink-0 object-contain" />}
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
