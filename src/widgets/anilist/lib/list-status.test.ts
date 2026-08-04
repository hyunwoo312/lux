import { describe, expect, it } from "vitest";
import {
  emptyListMessage,
  listFilterLabel,
  matchesListFilter,
} from "@/widgets/anilist/lib/list-status";

describe("matchesListFilter", () => {
  it("treats rewatching as in progress", () => {
    expect(matchesListFilter("progress", "CURRENT")).toBe(true);
    expect(matchesListFilter("progress", "REPEATING")).toBe(true);
    expect(matchesListFilter("progress", "PLANNING")).toBe(false);
  });

  it("maps each filter to its AniList statuses", () => {
    expect(matchesListFilter("planned", "PLANNING")).toBe(true);
    expect(matchesListFilter("dropped", "DROPPED")).toBe(true);
    expect(matchesListFilter("dropped", "PAUSED")).toBe(false);
  });

  it("admits every status under the all filter", () => {
    expect(matchesListFilter("all", "COMPLETED")).toBe(true);
    expect(matchesListFilter("all", "DROPPED")).toBe(true);
  });

  it("keeps a status-less entry under all but out of the narrower filters", () => {
    expect(matchesListFilter("all", undefined)).toBe(true);
    expect(matchesListFilter("progress", undefined)).toBe(false);
  });
});

describe("listFilterLabel", () => {
  it("says watching for anime, reading for manga, neutral for both", () => {
    expect(listFilterLabel("progress", "anime")).toBe("Watching");
    expect(listFilterLabel("progress", "manga")).toBe("Reading");
    expect(listFilterLabel("progress", "both")).toBe("In progress");
  });

  it("does not vary the other filters by media type", () => {
    expect(listFilterLabel("planned", "anime")).toBe("Planned");
    expect(listFilterLabel("planned", "manga")).toBe("Planned");
  });
});

describe("emptyListMessage", () => {
  it("points planned users at Discover", () => {
    expect(emptyListMessage("planned")).toMatch(/Discover/);
  });
});
