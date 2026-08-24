import { ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openUrl } from "@/lib/open-url";
import { useSettingsStore, type SettingsTab } from "@/settings";
import { useGuideStore } from "@/guide/useGuideStore";
import { GUIDE_MEDIA_SIZES } from "@/guide/mediaSizes";
import { InlineText } from "@/guide/components/InlineText";
import { ToolbarGuide } from "@/guide/components/ToolbarGuide";
import type { GuideBlock } from "@/guide/types";

export function ArticleBlock({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "prose":
      return (
        <p className="text-ink-2 text-body-lg leading-relaxed">
          <InlineText text={block.text} />
        </p>
      );

    case "heading":
      return <h3 className="text-ink text-title font-semibold">{block.text}</h3>;

    case "callout":
      return (
        <div className="border-primary/25 bg-primary/8 flex gap-4 rounded-xl border p-5">
          <Info className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-ink text-body font-semibold">{block.title}</p>
            <p className="text-ink-2 text-body leading-relaxed">
              <InlineText text={block.text} />
            </p>
          </div>
        </div>
      );

    case "steps":
      return (
        <ol className="flex flex-col gap-6">
          {block.steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-5">
              {index < block.steps.length - 1 && (
                <span aria-hidden className="bg-border absolute top-8 -bottom-6 left-3.5 w-px" />
              )}
              <span
                className="
                  bg-surface-2 text-ink ring-border relative z-10 grid size-7 shrink-0
                  place-items-center rounded-full text-caption font-medium ring-1
                "
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-1.5 pt-0.5">
                <span className="text-ink text-body font-medium">{step.title}</span>
                <span className="text-ink-3 text-body leading-relaxed">
                  <InlineText text={step.text} />
                </span>
              </span>
            </li>
          ))}
        </ol>
      );

    case "list":
      return (
        <ul className="flex flex-col gap-4">
          {block.items.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span aria-hidden className="bg-ink-4/50 mt-2.5 size-1.5 shrink-0 rounded-full" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-ink text-body font-medium">{item.title}</span>
                <span className="text-ink-3 text-body leading-relaxed">
                  <InlineText text={item.text} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      );

    case "toolbar":
      return <ToolbarGuide steps={block.steps} />;

    case "figure":
      return <Figure block={block} />;

    case "settingsLink":
      return <SettingsLink tab={block.tab} label={block.label} />;

    case "link":
      return (
        <Button variant="outline" className="w-fit" onClick={() => openUrl(block.href, "newTab")}>
          {block.label}
          <ExternalLink aria-hidden />
        </Button>
      );
  }
}

function Figure({ block }: { block: Extract<GuideBlock, { kind: "figure" }> }) {
  const size = GUIDE_MEDIA_SIZES[block.media];

  return (
    <figure className="flex flex-col gap-3">
      <img
        src={`/guide/${block.media}.webp`}
        alt={block.alt}
        width={size?.[0]}
        height={size?.[1]}
        loading="lazy"
        decoding="async"
        className="
          ring-border/70 h-auto max-h-[30rem] w-auto max-w-full self-center rounded-xl ring-1
        "
      />
      <figcaption className="text-ink-3 text-center text-caption">{block.caption}</figcaption>
    </figure>
  );
}

function SettingsLink({ tab, label }: { tab: SettingsTab; label: string }) {
  const openSettings = useSettingsStore((s) => s.openSettings);
  const closeGuide = useGuideStore((s) => s.closeGuide);

  return (
    <Button
      variant="outline"
      className="w-fit"
      onClick={() => {
        closeGuide();
        openSettings(tab);
      }}
    >
      {label}
    </Button>
  );
}
