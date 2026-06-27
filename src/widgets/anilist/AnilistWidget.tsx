import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useIntegrationStore } from "@/integrations";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { CurrentView } from "@/widgets/anilist/components/CurrentView";
import { ActivityView } from "@/widgets/anilist/components/ActivityView";
import { InboxView } from "@/widgets/anilist/components/InboxView";
import { DiscoverView } from "@/widgets/anilist/components/DiscoverView";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";

const PANE_EASE = [0.22, 1, 0.36, 1] as const;

export function AnilistWidget() {
  const reduced = useReducedMotion();
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist") ?? null,
  );
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);
  const activeTab = useAnilistStore((s) => s.activeTab);
  const newTab = useAnilistStore((s) => s.openBehavior === "newTab");

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  if (!loaded) return <AnilistPlaceholder>Loading…</AnilistPlaceholder>;

  const connected = account?.status === "connected";
  if (!connected) return <DiscoverView />;

  const userId = Number(account.providerAccountId);
  const transition = { duration: reduced ? 0 : 0.3, ease: PANE_EASE };

  return (
    <div className="relative h-full min-h-0">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={activeTab}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          {activeTab === "current" ? (
            <CurrentView enabled={connected} userId={userId} newTab={newTab} />
          ) : activeTab === "activity" ? (
            <ActivityView enabled={connected} newTab={newTab} />
          ) : (
            <InboxView enabled={connected} newTab={newTab} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
