import { pruneInstance } from "@/widgets/core/instanceCleanup";
import { useWidgetSettingsStore } from "@/widgets/core/useWidgetSettingsStore";

const store = () => useWidgetSettingsStore.getState();

describe("useWidgetSettingsStore", () => {
  beforeEach(() => {
    useWidgetSettingsStore.setState({ settings: {} });
  });

  it("sets the background for an instance", () => {
    store().setBackground("a", "solid");

    expect(store().settings["a"]?.background).toBe("solid");
  });

  it("removes an instance's settings", () => {
    store().setBackground("a", "solid");
    store().setBackground("b", "glass");

    store().removeInstance("a");

    expect(store().settings["a"]).toBeUndefined();
    expect(store().settings["b"]?.background).toBe("glass");
  });

  it("drops an instance's settings when the instance is pruned", () => {
    store().setBackground("a", "solid");

    pruneInstance("a");

    expect(store().settings["a"]).toBeUndefined();
  });
});
