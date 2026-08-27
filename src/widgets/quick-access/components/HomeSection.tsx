import { AlertCircle } from "lucide-react";
import { InlinePermissionPrompt } from "@/components/PermissionPrompt";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { useSettingsStore } from "@/settings";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import type { BrowserState } from "@/widgets/quick-access/hooks/useBrowserItems";
import { SECTION_GATE } from "@/widgets/quick-access/lib/gates";
import type { BrowserItem, ItemSource, QuickAccessView } from "@/widgets/quick-access/types";
import type { OpenBehavior } from "@/lib/open-url";
import type { MouseEvent, RefObject } from "react";

type GatedSource = Exclude<ItemSource, "history">;

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ink-3 text-micro px-1 font-semibold tracking-wider uppercase">
      {children}
    </span>
  );
}

export function HomeSection({
  source,
  title,
  state,
  view,
  openBehavior,
  animateLayout,
  pinnedUrls,
  scrollRef,
  blocked,
  onOpen,
  onTogglePin,
  onCloseTab,
  onToggleMuted,
}: {
  source: GatedSource;
  title: string;
  state: BrowserState;
  view: QuickAccessView;
  openBehavior: OpenBehavior;
  animateLayout: boolean;
  pinnedUrls: Set<string>;
  scrollRef: RefObject<HTMLElement | null>;
  blocked: boolean;
  onOpen: (item: BrowserItem, event: MouseEvent<HTMLAnchorElement>) => void;
  onTogglePin: (item: BrowserItem) => void;
  onCloseTab?: (item: BrowserItem) => void;
  onToggleMuted?: (item: BrowserItem) => void;
}) {
  const items = state.status === "ready" ? state.items : [];
  if (!blocked && state.status !== "error" && items.length === 0) return null;
  const gate = SECTION_GATE[source];

  return (
    <section className="mt-3 flex flex-col gap-1.5">
      <SectionHeader>{title}</SectionHeader>
      {blocked ? (
        <InlinePermissionPrompt
          permissions={gate.permissions}
          message={gate.message}
          partlyGrantedMessage={gate.partlyGrantedMessage}
          onOpenSettings={() => useSettingsStore.getState().openPermissions(gate.highlight)}
        />
      ) : state.status === "error" ? (
        <StateMessage
          icon={AlertCircle}
          tone="error"
          message={`Couldn’t load ${title.toLowerCase()}.`}
          action={<RetryButton onRetry={state.retry} retrying={false} />}
        />
      ) : (
        <BrowserList
          items={items}
          view={view}
          scrollRef={scrollRef}
          openBehavior={openBehavior}
          animateLayout={animateLayout}
          pinnedUrls={pinnedUrls}
          onOpen={onOpen}
          onTogglePin={onTogglePin}
          onCloseTab={onCloseTab}
          onToggleMuted={onToggleMuted}
        />
      )}
    </section>
  );
}
