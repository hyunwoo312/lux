import { SPRING_CRISP } from "@/lib/motion";
import type { ComponentType, ReactNode } from "react";
import { useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
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
      <span className="text-ink-3 text-micro font-semibold tracking-wider uppercase">{label}</span>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

export function WidgetConfigDisclosure({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="press focus-ring flex cursor-pointer items-center gap-1.5 rounded-md text-left"
      >
        <ChevronRight
          aria-hidden
          className={cn("text-ink-3 size-3.5 shrink-0 transition-transform", open && "rotate-90")}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body leading-none font-medium">{title}</span>
          {description && (
            <span className="text-ink-3 text-caption leading-snug">{description}</span>
          )}
        </span>
      </button>
      {open && children}
    </div>
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
      <span className="text-body leading-none font-medium">{title}</span>
      {description && <span className="text-ink-3 text-caption leading-snug">{description}</span>}
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
  onChange: (value: T, origin?: { x: number; y: number }) => void;
  disabled?: boolean;
  label: string;
  fit?: "wrap" | "line";
};

export function ConfigSegmented<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  label,
  fit = "wrap",
}: SegmentedProps<T>) {
  const oneLine = fit === "line";
  const layoutId = useId();
  const origin = useRef<{ x: number; y: number } | undefined>(undefined);
  const handleChange = (next: string) => {
    const match = options.find((option) => option.value === next);
    if (match) onChange(match.value, origin.current);
  };
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "bg-foreground/5 max-w-full gap-0.5 rounded-md p-0.5",
        oneLine ? "flex w-full min-w-0 flex-nowrap" : "flex-wrap",
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            variant="segmented"
            className={cn(oneLine && (active ? "shrink-0" : "min-w-0 flex-1"))}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING_CRISP}
                className="bg-primary absolute inset-0 rounded-sm"
              />
            )}
            <span className={cn("relative z-10", oneLine && !active && "block truncate")}>
              {option.label}
            </span>
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
            variant="chip"
            className={cn(
              active
                ? "border-primary/40 bg-primary/10 text-ink"
                : "border-border text-ink-3 hover:bg-accent/60",
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
