import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useProviderAccount } from "@/integrations";
import { StateMessage } from "@/components/StateMessage";
import { useAnilist } from "@/widgets/anilist/useAnilistStore";
import { LibraryView } from "@/widgets/anilist/components/LibraryView";
import { FeedView } from "@/widgets/anilist/components/FeedView";
import { DiscoverView } from "@/widgets/anilist/components/DiscoverView";
import { fade } from "@/lib/motion";

export function AnilistWidget() {
  const reduced = useReducedMotion();
  const { account, loaded } = useProviderAccount("anilist");
  const activeTab = useAnilist((d) => d.activeTab);
  const newTab = useAnilist((d) => d.openBehavior === "newTab");

  if (!loaded) return <StateMessage message="Loading AniList…" />;

  const connected = account?.status === "connected";
  if (!connected) return <DiscoverView />;

  const userId = Number(account.providerAccountId);

  return (
    <div className="relative h-full min-h-0">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={activeTab} className="absolute inset-0" {...fade(reduced, "fast")}>
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
