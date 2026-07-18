import { beforeEach, describe, expect, it } from "vitest";
import { useNewsStore } from "@/widgets/news/useNewsStore";

const store = () => useNewsStore.getState();
const ID = "news-1";

beforeEach(() => {
  useNewsStore.setState({ byInstance: {} });
});

describe("useNewsStore", () => {
  it("switches the active source", () => {
    store().setActiveSource(ID, "bbc");
    expect(store().byInstance[ID]?.activeSource).toBe("bbc");
  });

  it("seeds an instance with defaults on first change", () => {
    store().setRegion(ID, "uk");
    expect(store().byInstance[ID]).toMatchObject({
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

  it("sets the topic", () => {
    store().setTopic(ID, "technology");
    expect(store().byInstance[ID]?.topic).toBe("technology");
  });

  it("toggles sort-by-latest", () => {
    store().setSortByLatest(ID, true);
    expect(store().byInstance[ID]?.sortByLatest).toBe(true);
  });

  it("sets the Google search query and open behavior", () => {
    store().setGoogleQuery(ID, "tesla");
    store().setOpenBehavior(ID, "currentTab");
    expect(store().byInstance[ID]?.googleQuery).toBe("tesla");
    expect(store().byInstance[ID]?.openBehavior).toBe("currentTab");
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

  it("adds muted terms trimmed, without case-insensitive duplicates", () => {
    store().addMutedTerm(ID, "  Crypto ");
    store().addMutedTerm(ID, "crypto");
    store().addMutedTerm(ID, "");
    expect(store().byInstance[ID]?.mutedTerms).toEqual(["Crypto"]);

    store().removeMutedTerm(ID, "Crypto");
    expect(store().byInstance[ID]?.mutedTerms).toEqual([]);
  });

  it("caps the muted-terms list at twenty entries", () => {
    for (let index = 0; index < 25; index += 1) store().addMutedTerm(ID, `term-${index}`);
    expect(store().byInstance[ID]?.mutedTerms).toHaveLength(20);
  });

  it("drops an instance on cleanup", () => {
    store().setActiveSource(ID, "bbc");
    store().removeInstance(ID);
    expect(store().byInstance[ID]).toBeUndefined();
  });
});
