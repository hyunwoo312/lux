// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/usePermission", () => ({ useGrantedPermissions: () => null }));

import { BrowserTab } from "@/widgets/quick-access/components/BrowserTab";

describe("BrowserTab", () => {
  it("shows the loading state, not a blank panel, until the granted permissions are known", () => {
    render(<BrowserTab tab="bookmarks" editing={false} />);

    expect(screen.getByText("Loading bookmarks…")).toBeInTheDocument();
  });
});
