// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { GUIDE_NUDGED_KEY, useGuideStore } from "@/guide/useGuideStore";
import { FIRST_ARTICLE_ID } from "@/guide/content";

beforeEach(() => {
  localStorage.clear();
  useGuideStore.setState({ open: false, nudgeOpen: false, articleId: FIRST_ARTICLE_ID });
});

describe("guide store", () => {
  it("nudges once when the guide is closed for the first time", () => {
    useGuideStore.getState().openGuide();
    useGuideStore.getState().closeGuide();

    expect(useGuideStore.getState().nudgeOpen).toBe(true);
  });

  it("never nudges again after the first time", () => {
    useGuideStore.getState().closeGuide();
    useGuideStore.getState().dismissNudge();

    useGuideStore.getState().openGuide();
    useGuideStore.getState().closeGuide();

    expect(useGuideStore.getState().nudgeOpen).toBe(false);
  });

  it("remembers across reloads, not just within a session", () => {
    useGuideStore.getState().closeGuide();
    expect(localStorage.getItem(GUIDE_NUDGED_KEY)).toBe("1");
  });

  it("clears the nudge when the guide is reopened from it", () => {
    useGuideStore.getState().closeGuide();
    expect(useGuideStore.getState().nudgeOpen).toBe(true);

    useGuideStore.getState().openGuide();
    expect(useGuideStore.getState().nudgeOpen).toBe(false);
  });
});
