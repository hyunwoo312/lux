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
          },
        },
      };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });
});
