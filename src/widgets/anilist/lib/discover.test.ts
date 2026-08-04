import { describe, expect, it } from "vitest";
import {
  buildDiscoverVariables,
  currentSeason,
  discoverFeedLabel,
} from "@/widgets/anilist/lib/discover";

describe("currentSeason", () => {
  it("maps months to anime seasons", () => {
    expect(currentSeason(new Date("2026-01-15")).season).toBe("WINTER");
    expect(currentSeason(new Date("2026-04-15")).season).toBe("SPRING");
    expect(currentSeason(new Date("2026-07-15")).season).toBe("SUMMER");
    expect(currentSeason(new Date("2026-10-15")).season).toBe("FALL");
  });

  it("rolls December into next year's winter season", () => {
    const { season, year } = currentSeason(new Date("2026-12-15"));
    expect(season).toBe("WINTER");
    expect(year).toBe(2027);
  });
});

describe("buildDiscoverVariables", () => {
  const now = new Date("2026-08-04");

  it("sorts trending without season filters", () => {
    expect(buildDiscoverVariables("trending", "anime", now)).toEqual({
      type: "ANIME",
      sort: ["TRENDING_DESC"],
    });
  });

  it("scopes the season feed to the current anime season", () => {
    expect(buildDiscoverVariables("season", "anime", now)).toEqual({
      type: "ANIME",
      sort: ["POPULARITY_DESC"],
      season: "SUMMER",
      seasonYear: 2026,
    });
  });

  it("drops season filters for manga, which has no seasons", () => {
    expect(buildDiscoverVariables("season", "manga", now)).toEqual({
      type: "MANGA",
      sort: ["POPULARITY_DESC"],
    });
    expect(buildDiscoverVariables("top", "manga", now)).toEqual({
      type: "MANGA",
      sort: ["SCORE_DESC"],
    });
  });

  it("filters upcoming to unreleased titles", () => {
    expect(buildDiscoverVariables("upcoming", "anime", now)).toEqual({
      type: "ANIME",
      sort: ["POPULARITY_DESC"],
      status: "NOT_YET_RELEASED",
    });
  });
});

describe("discoverFeedLabel", () => {
  it("drops the season wording for manga", () => {
    expect(discoverFeedLabel("season", "anime")).toBe("Popular this season");
    expect(discoverFeedLabel("season", "manga")).toBe("Popular");
  });
});
