// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useGuideStore } from "@/guide/useGuideStore";
import { FIRST_ARTICLE_ID } from "@/guide/content";
import { useToastStore } from "@/stores/useToastStore";

const nudge = () => useToastStore.getState().toast;

beforeEach(() => {
  localStorage.clear();
  useGuideStore.setState({ open: false, articleId: FIRST_ARTICLE_ID });
  useToastStore.setState({ toast: null });
});

describe("guide store", () => {
  it("offers a way back the first time the guide is closed", () => {
    useGuideStore.getState().openGuide();
    useGuideStore.getState().closeGuide();

    expect(nudge()?.action).toMatchObject({ kind: "action", label: "Reopen" });
  });

  it("never nudges again, including after a reload", () => {
    useGuideStore.getState().closeGuide();
    useToastStore.setState({ toast: null });

    useGuideStore.getState().openGuide();
    useGuideStore.getState().closeGuide();

    expect(nudge()).toBeNull();
  });

  it("clears the nudge when the guide is reopened", () => {
    useGuideStore.getState().closeGuide();
    expect(nudge()).not.toBeNull();

    useGuideStore.getState().openGuide();

    expect(nudge()).toBeNull();
    expect(useGuideStore.getState().open).toBe(true);
  });
});
