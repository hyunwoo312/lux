// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReleaseList } from "@/widgets/github/components/ReleasesView";
import type { Release, ReleasesData } from "@/widgets/github/types";

function release(overrides: Partial<Release> = {}): Release {
  return {
    id: "r1",
    repo: "o/web",
    isPrivate: false,
    name: "Grid pass",
    tagName: "v1.0.0",
    url: "https://github.com/o/web/releases/tag/v1.0.0",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isPrerelease: false,
    ...overrides,
  };
}

function data(overrides: Partial<ReleasesData> = {}): ReleasesData {
  const releases = overrides.releases ?? [release()];
  return {
    releases,
    watchedCount: releases.length,
    watchedScanned: releases.length,
    ...overrides,
  };
}

function renderList(payload: ReleasesData, showPrivate = true) {
  return render(<ReleaseList data={payload} showPrivate={showPrivate} newTab={false} />);
}

describe("ReleaseList", () => {
  it("links each release to its own tag page", () => {
    renderList(data());

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://github.com/o/web/releases/tag/v1.0.0",
    );
  });

  it("marks a pre-release and leaves a stable release unmarked", () => {
    renderList(
      data({
        releases: [
          release({ id: "r1", repo: "o/stable" }),
          release({ id: "r2", repo: "o/beta", isPrerelease: true }),
        ],
      }),
    );

    expect(screen.getAllByText("Pre-release")).toHaveLength(1);
  });

  it("explains that private releases are hidden rather than reading as empty", () => {
    renderList(data({ releases: [release({ isPrivate: true })] }), false);

    expect(screen.getByText(/private repositories/i)).toBeInTheDocument();
  });

  it("says none of the watched repositories have released when the list is genuinely empty", () => {
    renderList(data({ releases: [], watchedCount: 12, watchedScanned: 12 }));

    expect(screen.getByText(/have published a release/i)).toBeInTheDocument();
  });

  it("discloses the scan cap only when the watch list is longer than one page", () => {
    const { unmount } = renderList(data({ watchedCount: 240, watchedScanned: 100 }));
    expect(screen.getByText(/100 most recently pushed of 240/)).toBeInTheDocument();
    unmount();

    renderList(data({ watchedCount: 40, watchedScanned: 40 }));
    expect(screen.queryByText(/most recently pushed/)).not.toBeInTheDocument();
  });
});
