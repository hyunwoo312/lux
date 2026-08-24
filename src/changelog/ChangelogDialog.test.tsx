// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChangelogDialog } from "@/changelog/ChangelogDialog";
import { RELEASES, highlightsOf } from "@/changelog/releases";

function open() {
  render(<ChangelogDialog open onOpenChange={() => {}} />);
}

describe("ChangelogDialog", () => {
  it("offers every release in the rail so the archive stays reachable", () => {
    open();
    for (const release of RELEASES) {
      expect(screen.getByRole("button", { name: new RegExp(`v${release.version}`) })).toBeTruthy();
    }
  });

  it("moves to an older release without leaving the newest one behind", () => {
    open();
    const older = RELEASES[3];

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`v${older?.version}`) }));

    expect(screen.getByText(older?.summary ?? "")).toBeInTheDocument();
    expect(screen.queryByText(RELEASES[0]?.summary ?? "")).not.toBeInTheDocument();
  });

  it("leads the newest release with its highlights", () => {
    open();
    const latest = RELEASES[0];
    const first = latest ? highlightsOf(latest)[0] : undefined;

    expect(first).toBeDefined();
    expect(screen.getByText(first?.text ?? "")).toBeInTheDocument();
  });

  it("tags the newest release in both the rail and the title", () => {
    open();

    expect(screen.getAllByText("Current")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: `Version ${RELEASES[0]?.version}` })).toBeTruthy();
  });

  it("keeps the rail tag on the newest release but drops the title tag on an older one", () => {
    open();
    const older = RELEASES[3];

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`v${older?.version}`) }));

    expect(screen.getByRole("heading", { name: `Version ${older?.version}` })).toBeTruthy();
    expect(screen.getAllByText("Current")).toHaveLength(1);

    const newestRow = screen.getByRole("button", { name: new RegExp(`v${RELEASES[0]?.version}`) });
    expect(newestRow.textContent).toContain("Current");
  });
});
