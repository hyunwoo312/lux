import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useIntegrationStore } from "@/integrations";
import { StateMessage } from "@/components/StateMessage";
import { useAnilist } from "@/widgets/anilist/useAnilistStore";
import { LibraryView } from "@/widgets/anilist/components/LibraryView";
import { FeedView } from "@/widgets/anilist/components/FeedView";
import { DiscoverView } from "@/widgets/anilist/components/DiscoverView";
import { DURATION, EASE_OUT } from "@/lib/motion";

export function AnilistWidget() {
  const reduced = useReducedMotion();
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist") ?? null,
  );
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);
  const activeTab = useAnilist((d) => d.activeTab);
  const newTab = useAnilist((d) => d.openBehavior === "newTab");

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  if (!loaded) return <StateMessage message="Loading AniList…" />;

  const connected = account?.status === "connected";
  if (!connected) return <DiscoverView />;

  const userId = Number(account.providerAccountId);
  const enterTransition = { duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT };
  const exitTransition = { duration: reduced ? 0 : DURATION.instant, ease: EASE_OUT };

  return (
    <div className="relative h-full min-h-0">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={activeTab}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: enterTransition }}
          exit={{ opacity: 0, transition: exitTransition }}
        >
          {activeTab === "library" ? (
            <LibraryView enabled={connected} userId={userId} newTab={newTab} />
          ) : activeTab === "discover" ? (
            <DiscoverView />
          ) : (
            <FeedView enabled={connected} userId={userId} newTab={newTab} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
