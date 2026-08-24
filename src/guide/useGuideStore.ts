import { create } from "zustand";
import { getLocal, setLocal } from "@/lib/local-store";
import { FIRST_ARTICLE_ID } from "@/guide/content";

export const GUIDE_NUDGED_KEY = "lux.guide.nudged";

type HelpState = {
  open: boolean;
  articleId: string;
  nudgeOpen: boolean;
  openGuide: (articleId?: string) => void;
  closeGuide: () => void;
  dismissNudge: () => void;
  setArticle: (articleId: string) => void;
};

export const useGuideStore = create<HelpState>()((set) => ({
  open: false,
  articleId: FIRST_ARTICLE_ID,
  nudgeOpen: false,
  openGuide: (articleId) =>
    set({ open: true, nudgeOpen: false, articleId: articleId ?? FIRST_ARTICLE_ID }),
  closeGuide: () => {
    const firstTime = getLocal(GUIDE_NUDGED_KEY) === null;
    if (firstTime) setLocal(GUIDE_NUDGED_KEY, "1");
    set({ open: false, nudgeOpen: firstTime });
  },
  dismissNudge: () => set({ nudgeOpen: false }),
  setArticle: (articleId) => set({ articleId }),
}));
