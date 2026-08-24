import { Fragment } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { InlineText } from "@/guide/components/InlineText";
import { TOOLBAR_GROUPS } from "@/guide/toolbarLayout";

export function ToolbarGuide({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="bg-surface-2 flex justify-center rounded-xl px-4 pt-10 pb-12">
        <div className="glass flex items-center gap-1 rounded-lg p-1">
          {TOOLBAR_GROUPS.map((group, index) => (
            <Fragment key={index}>
              {index === TOOLBAR_GROUPS.length - 1 && (
                <Separator orientation="vertical" className="mx-1 h-6" />
              )}
              <div className="relative">
                <div className={cn("flex items-center gap-1 rounded-lg p-0.5 ring-2", group.ring)}>
                  {group.icons.map((Icon, iconIndex) => (
                    <span
                      key={iconIndex}
                      aria-hidden
                      className="text-ink-3 grid size-9 place-items-center rounded-md"
                    >
                      <Icon className="size-5" />
                    </span>
                  ))}
                </div>
                <span
                  aria-hidden
                  className={cn(
                    `
                      absolute -bottom-7 left-1/2 grid size-5 -translate-x-1/2 place-items-center
                      rounded-full text-micro font-semibold
                    `,
                    group.badge,
                  )}
                >
                  {index + 1}
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span
              className={cn(
                `grid size-6 shrink-0 place-items-center rounded-full text-caption font-semibold`,
                TOOLBAR_GROUPS[index]?.badge,
              )}
            >
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-ink text-body font-medium">{step.title}</span>
              <span className="text-ink-3 text-body leading-relaxed">
                <InlineText text={step.text} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
