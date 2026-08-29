import { collapse, springCrisp } from "@/lib/motion";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useRovingFocus } from "@/hooks/useRovingFocus";
import type { WidgetIcon } from "@/widgets/core/types";

export type WidgetTab<T extends string> = {
  value: T;
  label: string;
  icon: WidgetIcon;
  badge?: number;
  separated?: boolean;
};

type WidgetTabsProps<T extends string> = {
  tabs: WidgetTab<T>[];
  value: T;
  onSelect: (value: T) => void;
};

const UNDERLINE_INSET = 6;

type Indicator = { x: number; width: number };

export function WidgetTabs<T extends string>({ tabs, value, onSelect }: WidgetTabsProps<T>) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<T, HTMLButtonElement>());
  const activeRef = useRef(value);
  activeRef.current = value;
  const [wide, setWide] = useState(true);
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  const measure = useCallback(() => {
    const button = buttons.current.get(activeRef.current);
    if (!button) return;
    setIndicator({ x: button.offsetLeft, width: button.offsetWidth });
  }, []);

  useEffect(() => {
    const el = ref.current;
    const measurer = measureRef.current;
    if (!el || !measurer) return;
    const update = () => setWide(el.clientWidth >= measurer.scrollWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [value, wide, measure]);

  const tabKey = tabs.map((tab) => tab.value).join("|");
  useEffect(() => {
    const observer = new ResizeObserver(() => measure());
    buttons.current.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [measure, tabKey]);

  const roving = useRovingFocus({
    count: tabs.length,
    activeIndex: tabs.findIndex((tab) => tab.value === value),
    onActivate: (index) => {
      const next = tabs[index];
      if (next) onSelect(next.value);
    },
  });

  return (
    <div
      ref={ref}
      role="tablist"
      {...roving.containerProps}
      className="relative flex w-full items-center gap-0.5"
    >
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute flex items-center gap-0.5"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <span key={tab.value} className="flex items-center">
              {tab.separated && <span className="mx-1 w-px" />}
              <span
                className="
                  flex items-center px-1.5 py-1 text-caption font-medium
                  [&_img]:size-3.5
                  [&_svg]:size-3.5
                "
              >
                <Icon />
                <span className="pl-1.5">{tab.label}</span>
              </span>
            </span>
          );
        })}
      </div>
      {indicator && (
        <motion.span
          aria-hidden
          className="bg-primary absolute -bottom-1 left-0 h-0.5 rounded-full"
          initial={false}
          animate={{
            x: indicator.x + UNDERLINE_INSET,
            width: Math.max(0, indicator.width - UNDERLINE_INSET * 2),
          }}
          transition={springCrisp(reduced)}
        />
      )}
      {tabs.map((tab, index) => {
        const isActive = tab.value === value;
        const Icon = tab.icon;
        const item = roving.itemProps(index);
        return (
          <Fragment key={tab.value}>
            {tab.separated && (
              <span className="bg-border/60 mx-1 h-3.5 w-px shrink-0" aria-hidden />
            )}
            <button
              {...item}
              ref={(el) => {
                if (el) buttons.current.set(tab.value, el);
                else buttons.current.delete(tab.value);
                item.ref?.(el);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.badge ? `${tab.label} (${tab.badge})` : tab.label}
              onClick={() => onSelect(tab.value)}
              className={cn(
                "press focus-ring",
                `
                  relative flex cursor-pointer items-center rounded-md px-1.5 py-1 text-caption
                  font-medium transition-colors
                  [&_img]:size-3.5
                  [&_svg]:size-3.5
                `,
                isActive ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {tab.badge ? (
                <span
                  aria-hidden
                  className="
                    bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-3.5
                    min-w-3.5 items-center justify-center rounded-full px-1 text-micro leading-none
                    font-semibold tabular-nums
                  "
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              ) : null}
              <Icon />
              <AnimatePresence initial={false}>
                {(isActive || wide) && (
                  <motion.span
                    key="label"
                    {...collapse(reduced, "width")}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <span className="pl-1.5">{tab.label}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
