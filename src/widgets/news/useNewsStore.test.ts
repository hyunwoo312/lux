import { beforeEach, describe, expect, it } from "vitest";
import { MAX_BOOKMARKS } from "@/widgets/news/types";
import { useNewsStore } from "@/widgets/news/useNewsStore";

const store = () => useNewsStore.getState();
const ID = "news-1";
const data = () => useNewsStore.getState().byInstance[ID]!;

beforeEach(() => {
  useNewsStore.setState({ byInstance: {} });
});

describe("useNewsStore", () => {
  it("seeds an instance with defaults on first change", () => {
    store().setRegion(ID, "uk");
    expect(store().byInstance[ID]).toMatchObject({
      view: "news",
      trendRegion: "US",
      activeSource: "all",
      region: "uk",
      topic: "top",
      layout: "list",
      googleQuery: "",
      enabledSources: ["bbc", "guardian", "nyt", "yahoo"],
      openBehavior: "currentTab",
      sortByLatest: true,
      mutedTerms: [],
      highlightTerms: [],
    });
  });

  it("updates enabled sources but ignores an empty selection", () => {
    store().setEnabledSources(ID, ["nyt", "bbc"]);
    expect(store().byInstance[ID]?.enabledSources).toEqual(["nyt", "bbc"]);

    store().setEnabledSources(ID, []);
    expect(store().byInstance[ID]?.enabledSources).toEqual(["nyt", "bbc"]);
  });

  it("ignores a selection above the enabled-sources cap", () => {
    store().setEnabledSources(ID, ["nyt", "bbc"]);
    store().setEnabledSources(ID, ["google", "nyt", "bbc", "guardian", "npr", "yahoo"]);
    expect(store().byInstance[ID]?.enabledSources).toEqual(["nyt", "bbc"]);
  });

  it("keeps instances independent", () => {
    const OTHER = "news-2";
    store().setActiveSource(ID, "nyt");
    store().setActiveSource(OTHER, "yahoo");
    expect(store().byInstance[ID]?.activeSource).toBe("nyt");
    expect(store().byInstance[OTHER]?.activeSource).toBe("yahoo");
  });

  it("records read and seen titles without duplicates", () => {
    store().markRead(ID, "a");
    store().markRead(ID, "a");
    store().markSeen(ID, ["x", "y"]);
    store().markSeen(ID, ["y", "z"]);
    expect(store().byInstance[ID]?.readTitles).toEqual(["a"]);
    expect(store().byInstance[ID]?.seenTitles).toEqual(["x", "y", "z"]);
  });

  it("caps read titles by dropping the oldest", () => {
    for (let index = 0; index < 205; index += 1) store().markRead(ID, `title-${index}`);
    const readTitles = store().byInstance[ID]?.readTitles ?? [];
    expect(readTitles).toHaveLength(200);
    expect(readTitles[0]).toBe("title-5");
    expect(readTitles.at(-1)).toBe("title-204");
  });

  it("adds muted terms trimmed, and says why one was not added", () => {
    expect(store().addMutedTerm(ID, "  Crypto ")).toBe("added");
    expect(store().addMutedTerm(ID, "crypto")).toBe("duplicate");
    expect(store().addMutedTerm(ID, "")).toBe("empty");
    expect(store().byInstance[ID]?.mutedTerms).toEqual(["Crypto"]);

    store().removeMutedTerm(ID, "Crypto");
    expect(store().byInstance[ID]?.mutedTerms).toEqual([]);
  });

  it("caps the muted-terms list at twenty entries and says the list is full", () => {
    for (let index = 0; index < 20; index += 1) store().addMutedTerm(ID, `term-${index}`);

    expect(store().addMutedTerm(ID, "one too many")).toBe("full");
    expect(store().byInstance[ID]?.mutedTerms).toHaveLength(20);
  });

  it("drops an instance on cleanup", () => {
    store().setActiveSource(ID, "bbc");
    store().removeInstance(ID);
    expect(store().byInstance[ID]).toBeUndefined();
  });
});

describe("data that predates the loadImages field", () => {
  it("rehydrates with images enabled so existing users see no change", () => {
    const legacy = {
      view: "news",
      trendRegion: "US",
      activeSource: "all",
      region: "us",
      topic: "top",
      layout: "list",
      googleQuery: "",
      enabledSources: ["google"],
      openBehavior: "currentTab",
      sortByLatest: false,
      readTitles: [],
      seenTitles: [],
      mutedTerms: [],
      highlightTerms: [],
    };

    const merged = useNewsStore.persist
      .getOptions()
      .merge?.({ byInstance: { legacy } }, useNewsStore.getState()) as
      | { byInstance?: Record<string, { loadImages?: boolean }> }
      | undefined;

    expect(merged?.byInstance?.legacy?.loadImages).toBe(true);
  });
});

describe("merge", () => {
  const merge = useNewsStore.persist.getOptions().merge;
  const mergeInto = (persisted: unknown) =>
    merge?.(persisted, { ...useNewsStore.getState(), byInstance: {} }) as ReturnType<
      typeof useNewsStore.getState
    >;

  const stored = {
    view: "news",
    trendRegion: "US",
    activeSource: "bbc",
    region: "uk",
    layout: "tiles",
    mutedTerms: ["crypto"],
    highlightTerms: ["climate"],
  };

  it("keeps the other widgets when one of them is unreadable", () => {
    const merged = mergeInto({ byInstance: { a: stored, b: 5, c: stored } });
    expect(Object.keys(merged.byInstance)).toEqual(["a", "c"]);
  });

  it("keeps the keyword lists when one setting is unreadable", () => {
    const merged = mergeInto({ byInstance: { a: { ...stored, region: "mars" } } });

    expect(merged.byInstance["a"]?.region).toBe("us");
    expect(merged.byInstance["a"]?.mutedTerms).toEqual(["crypto"]);
    expect(merged.byInstance["a"]?.highlightTerms).toEqual(["climate"]);
  });

  it("drops only the unreadable entries from a history list", () => {
    const merged = mergeInto({ byInstance: { a: { ...stored, readTitles: ["kept", 5] } } });
    expect(merged.byInstance["a"]?.readTitles).toEqual(["kept"]);
  });

  it("falls back to the default sources when none of the saved ones are real", () => {
    const merged = mergeInto({ byInstance: { a: { ...stored, enabledSources: ["nope"] } } });
    expect(merged.byInstance["a"]?.enabledSources.length).toBeGreaterThan(0);
  });

  it("starts empty rather than throwing on a blob with no widgets at all", () => {
    expect(mergeInto({}).byInstance).toEqual({});
    expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
    expect(mergeInto({ byInstance: [] }).byInstance).toEqual({});
  });
});

describe("bookmarks", () => {
  const story = (link: string) => ({
    id: link,
    title: `Story ${link}`,
    link,
    source: "BBC News",
    sourceKey: "bbc" as const,
    sourceUrl: null,
    publishedAt: 0,
    image: null,
    dek: null,
    related: [],
  });

  it("saves a headline and reports that it did", () => {
    expect(store().toggleBookmark(ID, story("https://a"))).toBe(true);
    expect(data().bookmarks).toHaveLength(1);
    expect(data().bookmarks[0]?.item.link).toBe("https://a");
  });

  it("keeps the newest save first", () => {
    store().toggleBookmark(ID, story("https://a"));
    store().toggleBookmark(ID, story("https://b"));
    expect(data().bookmarks[0]?.item.link).toBe("https://b");
  });

  it("toggles the same headline back off", () => {
    store().toggleBookmark(ID, story("https://a"));
    store().toggleBookmark(ID, story("https://a"));
    expect(data().bookmarks).toHaveLength(0);
  });

  it("refuses a new save at the cap rather than dropping an older one", () => {
    const many = Array.from({ length: MAX_BOOKMARKS }, (_, index) => ({
      item: story(`https://x${index}`),
      savedAt: index,
    }));
    useNewsStore.setState({
      byInstance: { [ID]: { ...useNewsStore.getState().byInstance[ID]!, bookmarks: many } },
    });

    expect(store().toggleBookmark(ID, story("https://new"))).toBe(false);
    expect(data().bookmarks).toHaveLength(MAX_BOOKMARKS);
    expect(data().bookmarks.some((entry) => entry.item.link === "https://new")).toBe(false);
  });

  it("still lets you remove one when the list is full", () => {
    const many = Array.from({ length: MAX_BOOKMARKS }, (_, index) => ({
      item: story(`https://x${index}`),
      savedAt: index,
    }));
    useNewsStore.setState({
      byInstance: { [ID]: { ...useNewsStore.getState().byInstance[ID]!, bookmarks: many } },
    });

    expect(store().toggleBookmark(ID, story("https://x0"))).toBe(true);
    expect(data().bookmarks).toHaveLength(MAX_BOOKMARKS - 1);
  });

  it("keeps each widget's saved list separate", () => {
    store().toggleBookmark(ID, story("https://a"));
    store().toggleBookmark("other", story("https://b"));
    expect(data().bookmarks).toHaveLength(1);
    expect(useNewsStore.getState().byInstance["other"]?.bookmarks).toHaveLength(1);
  });
});
