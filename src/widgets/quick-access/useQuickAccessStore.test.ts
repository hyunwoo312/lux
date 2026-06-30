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
    store().addLink(ID, "", "github.com");

    const link = links(ID)[0];
    expect(link?.url).toBe("https://github.com/");
    expect(link?.title).toBe("github.com");
  });

  it("ignores an invalid url", () => {
    store().addLink(ID, "Bad", "   ");
    expect(links(ID)).toHaveLength(0);
  });

  it("edits a link", () => {
    store().addLink(ID, "GitHub", "github.com");
    const id = links(ID)[0]!.id;

    store().editLink(ID, id, "Code", "gitlab.com");

    expect(links(ID)[0]).toMatchObject({ title: "Code", url: "https://gitlab.com/" });
  });

  it("removes a link", () => {
    store().addLink(ID, "GitHub", "github.com");
    const id = links(ID)[0]!.id;

    store().removeLink(ID, id);

    expect(links(ID)).toHaveLength(0);
  });

  it("ignores a duplicate url when adding", () => {
    store().addLink(ID, "GitHub", "github.com");
    store().addLink(ID, "GitHub again", "https://github.com/");

    expect(links(ID)).toHaveLength(1);
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

    store().addLink("a", "A", "a.com");
    store().addLink("b", "B", "b.com");

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
