import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

const store = () => useQuickAccessStore.getState();

describe("useQuickAccessStore", () => {
  beforeEach(() => {
    useQuickAccessStore.setState({ links: [] });
  });

  it("adds a link, normalizing the url and defaulting the title to the host", () => {
    store().addLink("", "github.com");

    const link = store().links[0];
    expect(link?.url).toBe("https://github.com/");
    expect(link?.title).toBe("github.com");
  });

  it("ignores an invalid url", () => {
    store().addLink("Bad", "   ");
    expect(store().links).toHaveLength(0);
  });

  it("edits a link", () => {
    store().addLink("GitHub", "github.com");
    const id = store().links[0]!.id;

    store().editLink(id, "Code", "gitlab.com");

    expect(store().links[0]).toMatchObject({ title: "Code", url: "https://gitlab.com/" });
  });

  it("removes a link", () => {
    store().addLink("GitHub", "github.com");
    const id = store().links[0]!.id;

    store().removeLink(id);

    expect(store().links).toHaveLength(0);
  });

  it("ignores a duplicate url when adding", () => {
    store().addLink("GitHub", "github.com");
    store().addLink("GitHub again", "https://github.com/");

    expect(store().links).toHaveLength(1);
  });

  it("pins a url when not pinned and unpins it when already pinned", () => {
    store().togglePin("GitHub", "github.com");
    expect(store().links).toHaveLength(1);
    expect(store().links[0]).toMatchObject({ url: "https://github.com/" });

    store().togglePin("GitHub", "github.com");
    expect(store().links).toHaveLength(0);
  });

  it("replaces the link order", () => {
    store().setLinks([
      { id: "a", title: "A", url: "https://a.com/" },
      { id: "b", title: "B", url: "https://b.com/" },
    ]);

    expect(store().links.map((link) => link.id)).toEqual(["a", "b"]);
  });
});
