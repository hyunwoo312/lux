import { create } from "zustand";
import { getLocal, setLocal } from "@/lib/local-store";
import { FIRST_ARTICLE_ID } from "@/guide/content";
import { showToast, useToastStore } from "@/stores/useToastStore";

const GUIDE_NUDGED_KEY = "lux.guide.nudged";
const NUDGE_KEY = "guide-nudge";

type HelpState = {
  open: boolean;
  articleId: string;
  openGuide: (articleId?: string) => void;
  closeGuide: () => void;
  setArticle: (articleId: string) => void;
};

export const useGuideStore = create<HelpState>()((set) => ({
  open: false,
  articleId: FIRST_ARTICLE_ID,
  openGuide: (articleId) => {
    const toasts = useToastStore.getState();
    if (toasts.toast?.key === NUDGE_KEY) toasts.expire();
    set({ open: true, articleId: articleId ?? FIRST_ARTICLE_ID });
  },
  closeGuide: () => {
    set({ open: false });
    if (getLocal(GUIDE_NUDGED_KEY) !== null) return;
    setLocal(GUIDE_NUDGED_KEY, "1");
    showToast({
      key: NUDGE_KEY,
      message: "The guide is in the toolbar whenever you need it.",
      action: {
        kind: "action",
        label: "Reopen",
        run: () => useGuideStore.getState().openGuide(),
      },
    });
  },
  setArticle: (articleId) => set({ articleId }),
}));
