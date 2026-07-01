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
    store().setTopic(ID, "world");
    expect(store().byInstance[ID]).toMatchObject({
      activeSource: "google",
      topic: "world",
      googleQuery: "",
      enabledSources: ["google", "nyt", "bbc", "yahoo"],
      openBehavior: "currentTab",
      sortByLatest: false,
    });
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

  it("keeps instances independent", () => {
    const OTHER = "news-2";
    store().setActiveSource(ID, "nyt");
    store().setActiveSource(OTHER, "yahoo");
    expect(store().byInstance[ID]?.activeSource).toBe("nyt");
    expect(store().byInstance[OTHER]?.activeSource).toBe("yahoo");
  });

  it("drops an instance on cleanup", () => {
    store().setActiveSource(ID, "bbc");
    store().removeInstance(ID);
    expect(store().byInstance[ID]).toBeUndefined();
  });
});
