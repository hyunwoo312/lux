// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useToastStore } from "@/stores/useToastStore";
import { pruneSettledRemovals, removeWidgetInstance } from "@/widgets/core/instanceRemoval";
import type { WidgetInstance } from "@/widgets/core/types";
import { useWidgetSettingsStore } from "@/widgets/core/useWidgetSettingsStore";

const store = () => useDashboardStore.getState();
const background = (id: string) => useWidgetSettingsStore.getState().settings[id]?.background;

function addWithSettings(type: WidgetInstance["type"]): WidgetInstance {
  store().addWidget(type);
  const instance = store().widgets.at(-1)!;
  useWidgetSettingsStore.getState().setBackground(instance.id, "solid");
  return instance;
}

let stop: () => void;

beforeEach(() => {
  useDashboardStore.setState({ widgets: [], layout: [], columns: 12, pendingRemoval: null });
  useWidgetSettingsStore.setState({ settings: {} });
  useToastStore.setState({ toast: null });
  stop = pruneSettledRemovals();
});

afterEach(() => stop());

describe("removing a widget instance", () => {
  it("keeps the widget's content until the removal settles", () => {
    const instance = addWithSettings("tasks");

    removeWidgetInstance(instance);

    expect(store().widgets).toHaveLength(0);
    expect(background(instance.id)).toBe("solid");

    store().settlePendingRemoval(instance.id);

    expect(background(instance.id)).toBeUndefined();
  });

  it("offers undo in the toast, and undo brings the content back", () => {
    const instance = addWithSettings("tasks");
    removeWidgetInstance(instance);

    const toast = useToastStore.getState().toast;
    expect(toast?.message).toBe("Tasks removed");
    expect(toast?.action?.kind).toBe("undo");
    toast?.action?.run();

    expect(store().widgets.map((w) => w.id)).toEqual([instance.id]);
    expect(background(instance.id)).toBe("solid");
  });

  it("prunes the previous removal when a second widget is removed", () => {
    const first = addWithSettings("tasks");
    const second = addWithSettings("note");

    removeWidgetInstance(first);
    removeWidgetInstance(second);

    expect(background(first.id)).toBeUndefined();
    expect(background(second.id)).toBe("solid");
  });

  it("leaves the content alone when a reload brings the widget back", () => {
    const instance = addWithSettings("tasks");
    removeWidgetInstance(instance);

    useDashboardStore.setState({ widgets: [instance], pendingRemoval: null });

    expect(background(instance.id)).toBe("solid");
  });
});
