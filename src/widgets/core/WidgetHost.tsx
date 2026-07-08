import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/widgets/core/BaseWidget";
import { WidgetErrorBoundary } from "@/widgets/core/WidgetErrorBoundary";
import { CommonWidgetConfig } from "@/widgets/core/CommonWidgetConfig";
import { ConnectOverlay } from "@/components/ConnectOverlay";
import { WidgetConfig } from "@/components/config/WidgetConfig";
import { getAccentVars } from "@/widgets/core/accent";
import type { WidgetInstance } from "@/widgets/core/types";
import { useWidgetBackground } from "@/widgets/core/useWidgetSettingsStore";
import { useWidgetHighlightStore } from "@/widgets/core/useWidgetHighlightStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { getWidgetPlugin } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";

type WidgetHostProps = {
  instance: WidgetInstance;
  editing: boolean;
  size?: { w: number; h: number };
};

const useNoBare = () => false;
const useNoLock = () => null;

export function WidgetHost({ instance, editing, size }: WidgetHostProps) {
  const plugin = getWidgetPlugin(instance.type);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const background = useWidgetBackground(instance.id);
  const highlighted = useWidgetHighlightStore((s) => s.highlighted === instance.type);
  const isLastAdded = useDashboardStore((s) => s.lastAddedId === instance.id);
  const [pulse, setPulse] = useState(isLastAdded);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const useBare = plugin?.useBare ?? useNoBare;
  const bare = useBare(instance.id);
  const useLock = plugin?.useLock ?? useNoLock;
  const lock = useLock(instance.id);

  useEffect(() => {
    if (!pulse) return;
    containerRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
    const timer = window.setTimeout(() => {
      setPulse(false);
      const { lastAddedId, clearLastAdded } = useDashboardStore.getState();
      if (lastAddedId === instance.id) clearLastAdded();
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [pulse, reduced, instance.id]);

  if (!plugin) return null;

  const accent = plugin.accent ?? "default";

  const Widget = plugin.component;
  const ConfigComponent = plugin.configComponent;
  const StatusComponent = plugin.statusComponent;
  const HeaderActionComponent = plugin.headerActionComponent;
  const BackdropComponent = plugin.backdropComponent;
  const pluginRemovalNote = plugin.removalNote;

  const locked = Boolean(lock) && !editing;

  return (
    <WidgetInstanceContext.Provider value={instance.id}>
      <div ref={containerRef} className="relative h-full" style={getAccentVars(accent)}>
        <div inert={locked} className={cn("h-full", locked && "blur-[3px]")}>
          <BaseWidget
            title={plugin.name}
            editing={editing}
            size={size}
            background={background}
            accent={accent}
            bleed={plugin.bleed}
            bare={bare}
            highlighted={highlighted || pulse}
            backdrop={BackdropComponent ? <BackdropComponent /> : undefined}
            decorativeBackdrop={plugin.decorativeBackdrop}
            headline={StatusComponent ? <StatusComponent /> : undefined}
            headerAction={HeaderActionComponent ? <HeaderActionComponent /> : undefined}
            config={
              <WidgetConfig>
                <CommonWidgetConfig />
                {ConfigComponent && <ConfigComponent />}
              </WidgetConfig>
            }
            onRemove={() => removeWidget(instance.id)}
            removalNote={pluginRemovalNote ? () => pluginRemovalNote(instance.id) : undefined}
          >
            <WidgetErrorBoundary>
              <Widget editing={editing} />
            </WidgetErrorBoundary>
          </BaseWidget>
        </div>
        {locked && lock && (
          <ConnectOverlay
            message={lock.message}
            actionLabel={lock.actionLabel}
            onAction={lock.onAction}
          />
        )}
      </div>
    </WidgetInstanceContext.Provider>
  );
}
