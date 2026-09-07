import { springCrisp } from "@/lib/motion";
import type { ComponentType, ReactNode } from "react";
import { cloneElement, isValidElement, useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
import { TYPE } from "@/lib/type";
import { cn } from "@/lib/utils";

export function ConfigBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 [&>section:first-of-type>:first-child]:hidden">
      {children}
    </div>
  );
}

export function ConfigSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <Separator className="mb-1.5" />
      <div className="flex items-center justify-between gap-4">
        <h3 className={TYPE.eyebrow}>{title}</h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function ConfigDisclosure({
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
          <span className={TYPE.label}>{title}</span>
          {description && <span className={TYPE.help}>{description}</span>}
        </span>
      </button>
      {open && children}
    </div>
  );
}

type Labelled = {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  label?: string;
  children?: ReactNode;
};

function labelControl(control: ReactNode, labelId: string): ReactNode {
  if (!isValidElement<Labelled>(control)) return control;
  const { props } = control;
  if (props["aria-label"] || props["aria-labelledby"] || props.label) return control;
  if (props.children !== undefined && props.children !== null) return control;
  return cloneElement(control, { "aria-labelledby": labelId });
}

function ConfigText({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-w-0 grow basis-24 flex-col gap-0.5">
      <span id={id} className={TYPE.label}>
        {title}
      </span>
      {description && <span className={TYPE.help}>{description}</span>}
    </div>
  );
}

type ConfigRowProps = {
  title?: string;
  description?: string;
  control?: ReactNode;
  children?: ReactNode;
};

export function ConfigRow({ title, description, control, children }: ConfigRowProps) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-3">
      {(title || control) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {title && <ConfigText id={labelId} title={title} description={description} />}
          {control && (
            <div className="min-w-0 shrink-0">
              {title ? labelControl(control, labelId) : control}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function ConfigSubRow({
  title,
  description,
  control,
  disabled = false,
}: ConfigRowProps & { title: string; disabled?: boolean }) {
  const labelId = useId();
  return (
    <div
      inert={disabled}
      className={cn(
        `
          border-border/70 ml-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-l
          pl-3 transition-opacity
        `,
        disabled && "opacity-40",
      )}
    >
      <ConfigText id={labelId} title={title} description={description} />
      {control && <div className="shrink-0">{labelControl(control, labelId)}</div>}
    </div>
  );
}

type ConfigOption<T extends string> = {
  value: T;
  label: string;
};

type SelectControlProps<T extends string> = {
  value: T;
  options: ConfigOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
  triggerClassName?: string;
  contentClassName?: string;
};

export function ConfigSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  label,
  triggerClassName,
  contentClassName,
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
      <SelectContent className={contentClassName}>
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
  options: (ConfigOption<T> & { disabled?: boolean })[];
  onChange: (value: T) => void;
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
  const reduced = useReducedMotion();
  const oneLine = fit === "line";
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
            disabled={option.disabled}
            className={cn(oneLine && (active ? "shrink-0" : "min-w-0 flex-1"))}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={springCrisp(reduced)}
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
  options: (ConfigOption<T> & { icon?: ComponentType<{ className?: string }> })[];
  onChange: (values: T[]) => void;
  disabled?: boolean;
  maxSelected?: number;
  minSelected?: number;
  label: string;
};

export function ConfigMultiToggle<T extends string>({
  values,
  options,
  onChange,
  disabled = false,
  maxSelected,
  minSelected,
  label,
}: MultiToggleProps<T>) {
  const atCap = maxSelected !== undefined && values.length >= maxSelected;
  const atFloor = minSelected !== undefined && values.length <= minSelected;
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
            disabled={active ? atFloor : atCap}
            className={cn(active && atFloor && "disabled:opacity-100")}
            variant="chip"
          >
            {Icon && <Icon className="shrink-0 object-contain" />}
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
