// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPermissionsGranted, takePendingPermissionHighlight } from "@/lib/permissions";

const chromeRef = () => (globalThis as unknown as { chrome: typeof chrome }).chrome;
const reload = vi.fn();

beforeEach(() => {
  reload.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { reload },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function grantResolves(applied: boolean) {
  chromeRef().permissions.request = vi.fn(
    async () => applied,
  ) as unknown as typeof chrome.permissions.request;
  chromeRef().permissions.remove = vi.fn(
    async () => applied,
  ) as unknown as typeof chrome.permissions.remove;
}

describe("setPermissionsGranted", () => {
  it("reloads after granting tabs, which a loaded page cannot start using on its own", async () => {
    grantResolves(true);

    await setPermissionsGranted(["sessions", "tabs"], true);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload for permissions that take effect immediately", async () => {
    grantResolves(true);

    await setPermissionsGranted(["bookmarks"], true);

    expect(reload).not.toHaveBeenCalled();
  });

  it("does not reload when the user dismisses the browser prompt", async () => {
    grantResolves(false);

    await setPermissionsGranted(["sessions", "tabs"], true);

    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads after revoking tabs so no stale access lingers in the page", async () => {
    grantResolves(true);

    await setPermissionsGranted(["sessions", "tabs"], false);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("hands the settings row back across the reload only when asked", async () => {
    grantResolves(true);

    await setPermissionsGranted(["sessions", "tabs"], true, { reopenSettings: true });
    expect(takePendingPermissionHighlight()).toBe("sessions");

    await setPermissionsGranted(["sessions", "tabs"], true);
    expect(takePendingPermissionHighlight()).toBeNull();
  });

  it("clears the handoff so a later reload does not reopen settings again", async () => {
    grantResolves(true);

    await setPermissionsGranted(["sessions", "tabs"], true, { reopenSettings: true });

    expect(takePendingPermissionHighlight()).toBe("sessions");
    expect(takePendingPermissionHighlight()).toBeNull();
  });
});
