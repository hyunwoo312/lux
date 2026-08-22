import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

const store = () => useQuickAccessStore.getState();
const ID = "quickAccess-1";
const links = (instanceId: string) => store().byInstance[instanceId]?.links ?? [];

describe("useQuickAccessStore", () => {
  beforeEach(() => {
    useQuickAccessStore.setState({
      byInstance: {
        [ID]: {
          links: [],
          activeTab: "home",
          openBehavior: "currentTab",
          view: "grid",
          showTopSites: true,
          showOpenTabs: false,
          showRecentlyClosed: false,
        },
      },
    });
  });

  it("adds a link, normalizing the url and defaulting the title to the host", () => {
    store().addLink(ID, "", "github.com", "");

    const link = links(ID)[0];
    expect(link?.url).toBe("https://github.com/");
    expect(link?.title).toBe("github.com");
  });

  it("reports an invalid url instead of failing silently", () => {
    expect(store().addLink(ID, "Bad", "   ", "")).toBe("invalid");
    expect(links(ID)).toHaveLength(0);
  });

  it("edits a link", () => {
    store().addLink(ID, "GitHub", "github.com", "");
    const id = links(ID)[0]!.id;

    store().editLink(ID, id, "Code", "gitlab.com", "");

    expect(links(ID)[0]).toMatchObject({ title: "Code", url: "https://gitlab.com/" });
  });

  it("removes a link", () => {
    store().addLink(ID, "GitHub", "github.com", "");
    const id = links(ID)[0]!.id;

    store().removeLink(ID, id);

    expect(links(ID)).toHaveLength(0);
  });

  it("reports a duplicate url instead of failing silently", () => {
    store().addLink(ID, "GitHub", "github.com", "");

    expect(store().addLink(ID, "GitHub again", "https://github.com/", "")).toBe("duplicate");
    expect(links(ID)).toHaveLength(1);
  });

  it("keeps only the first grapheme of a custom icon", () => {
    store().addLink(ID, "Family", "example.com", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}xy");

    expect(links(ID)[0]?.icon).toBe("\u{1F468}\u200D\u{1F469}\u200D\u{1F467}");
  });

  it("stores no icon when the field is left blank", () => {
    store().addLink(ID, "Plain", "example.com", "   ");

    expect(links(ID)[0]?.icon).toBeUndefined();
  });

  it("restores a removed link to the position it was removed from", () => {
    store().addLink(ID, "One", "one.com", "");
    store().addLink(ID, "Two", "two.com", "");
    store().addLink(ID, "Three", "three.com", "");

    store().removeLink(ID, links(ID)[1]!.id);
    store().undoRemove(ID);

    expect(links(ID).map((link) => link.title)).toEqual(["One", "Two", "Three"]);
  });

  it("keeps a customized pin recoverable when it is unpinned from a browser list", () => {
    store().addLink(ID, "Code", "github.com", "🐙");
    const pinned = links(ID)[0]!;

    store().togglePin(ID, "GitHub", "https://github.com/");
    expect(links(ID)).toHaveLength(0);

    store().undoRemove(ID);

    expect(links(ID)[0]).toEqual(pinned);
  });

  it("does not duplicate a link when undo runs twice", () => {
    store().addLink(ID, "One", "one.com", "");

    store().removeLink(ID, links(ID)[0]!.id);
    store().undoRemove(ID);
    store().undoRemove(ID);

    expect(links(ID)).toHaveLength(1);
  });

  it("forgets the removal once it is dismissed", () => {
    store().addLink(ID, "One", "one.com", "");

    store().removeLink(ID, links(ID)[0]!.id);
    store().dismissRemoved(ID);
    store().undoRemove(ID);

    expect(links(ID)).toHaveLength(0);
  });

  it("pins a url when not pinned and unpins it when already pinned", () => {
    store().togglePin(ID, "GitHub", "github.com");
    expect(links(ID)).toHaveLength(1);
    expect(links(ID)[0]).toMatchObject({ url: "https://github.com/" });

    store().togglePin(ID, "GitHub", "github.com");
    expect(links(ID)).toHaveLength(0);
  });

  it("replaces the link order", () => {
    store().setLinks(ID, [
      { id: "a", title: "A", url: "https://a.com/" },
      { id: "b", title: "B", url: "https://b.com/" },
    ]);

    expect(links(ID).map((link) => link.id)).toEqual(["a", "b"]);
  });

  it("keeps instances independent", () => {
    const empty = {
      links: [],
      activeTab: "home" as const,
      openBehavior: "currentTab" as const,
      view: "grid" as const,
      showTopSites: true,
      showOpenTabs: false,
      showRecentlyClosed: false,
    };
    useQuickAccessStore.setState({ byInstance: { a: { ...empty }, b: { ...empty } } });

    store().addLink("a", "A", "a.com", "");
    store().addLink("b", "B", "b.com", "");

    expect(links("a").map((link) => link.url)).toEqual(["https://a.com/"]);
    expect(links("b").map((link) => link.url)).toEqual(["https://b.com/"]);
  });

  describe("migrate", () => {
    const migrate = useQuickAccessStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the quickAccess instance key", () => {
      const legacy = {
        links: [{ id: "g", title: "Google", url: "https://www.google.com/" }],
        activeTab: "bookmarks",
        openBehavior: "newTab",
        view: "list",
      };

      expect(migrate?.(legacy, 1)).toEqual({
        byInstance: {
          quickAccess: {
            links: [{ id: "g", title: "Google", url: "https://www.google.com/" }],
            activeTab: "bookmarks",
            openBehavior: "newTab",
            view: "list",
            showTopSites: true,
            showOpenTabs: false,
            showRecentlyClosed: false,
          },
        },
      });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ bogus: true }, 1)).toEqual({ byInstance: {} });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = {
        byInstance: {
          [ID]: {
            links: [],
            activeTab: "home",
            openBehavior: "currentTab",
            view: "grid",
            showTopSites: true,
            showOpenTabs: false,
            showRecentlyClosed: false,
          },
        },
      };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });

  describe("merge tolerance", () => {
    const merge = useQuickAccessStore.persist.getOptions().merge;
    const mergeInto = (persisted: unknown) =>
      merge?.(persisted, { ...useQuickAccessStore.getState(), byInstance: {} }) as ReturnType<
        typeof useQuickAccessStore.getState
      >;

    const pin = { id: "a", title: "A", url: "https://a.test/" };
    const stored = {
      links: [pin],
      activeTab: "home",
      openBehavior: "newTab",
      view: "list",
      showTopSites: false,
      showOpenTabs: false,
      showRecentlyClosed: false,
    };

    it("keeps the other widgets when one of them is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: stored, b: 5, c: stored } });
      expect(Object.keys(merged.byInstance)).toEqual(["a", "c"]);
    });

    it("keeps the pins when one setting is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: { ...stored, view: "nonsense" } } });

      expect(merged.byInstance["a"]?.view).toBe("grid");
      expect(merged.byInstance["a"]?.links).toHaveLength(1);
    });

    it("keeps the pins when a setting is missing entirely", () => {
      const merged = mergeInto({
        byInstance: { a: { links: [pin], openBehavior: "newTab", view: "list" } },
      });
      expect(merged.byInstance["a"]?.links).toHaveLength(1);
    });

    it("drops only the unreadable pin, never the whole row of them", () => {
      const merged = mergeInto({ byInstance: { a: { ...stored, links: [pin, 7, pin] } } });
      expect(merged.byInstance["a"]?.links).toHaveLength(2);
    });

    it("does not invent a widget out of a blob with nothing recognisable in it", () => {
      const migrate = useQuickAccessStore.persist.getOptions().migrate;
      expect(migrate?.({}, 1)).toEqual({ byInstance: {} });
      expect(migrate?.({ somethingElse: 1 }, 1)).toEqual({ byInstance: {} });
    });

    it("starts empty rather than throwing on a blob with no widgets at all", () => {
      expect(mergeInto({}).byInstance).toEqual({});
      expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
    });

    it("moves a widget parked on the retired Recent tab onto Home, with the section turned on", () => {
      const merged = mergeInto({
        byInstance: { a: { ...stored, activeTab: "recentlyClosed" } },
      });

      expect(merged.byInstance["a"]?.activeTab).toBe("home");
      expect(merged.byInstance["a"]?.showRecentlyClosed).toBe(true);
    });

    it("leaves a widget on a tab that still exists alone", () => {
      const merged = mergeInto({ byInstance: { a: { ...stored, activeTab: "history" } } });

      expect(merged.byInstance["a"]?.activeTab).toBe("history");
      expect(merged.byInstance["a"]?.showRecentlyClosed).toBe(false);
    });

    it("defaults the two new sections off for a widget saved before they existed", () => {
      const merged = mergeInto({ byInstance: { a: stored } });

      expect(merged.byInstance["a"]?.showOpenTabs).toBe(false);
      expect(merged.byInstance["a"]?.showRecentlyClosed).toBe(false);
    });
  });
});
