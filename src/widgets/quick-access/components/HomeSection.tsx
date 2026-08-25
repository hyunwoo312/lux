import { PermissionPrompt } from "@/components/PermissionPrompt";
import { useSettingsStore } from "@/settings";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
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
  items,
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
  children,
}: {
  source: GatedSource;
  title: string;
  items: BrowserItem[];
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
  children?: React.ReactNode;
}) {
  if (!blocked && items.length === 0) return null;
  const gate = SECTION_GATE[source];
  const granted = gate.permissions.length;

  return (
    <section className="mt-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <SectionHeader>{title}</SectionHeader>
        {children}
      </div>
      {blocked ? (
        <PermissionPrompt
          permissions={gate.permissions}
          variant="inline"
          message={
            granted > 1 && gate.partlyGrantedMessage ? gate.partlyGrantedMessage : gate.message
          }
          onOpenSettings={() => useSettingsStore.getState().openPermissions(gate.highlight)}
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
