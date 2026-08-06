import { describe, expect, it } from "vitest";
import {
  parseCachedActivity,
  parseCachedCurrent,
  parseCachedDiscover,
  parseCachedInbox,
} from "@/widgets/anilist/lib/anilist-api";
import type {
  AnilistActivity,
  AnilistNotification,
  CurrentData,
  CurrentEntry,
  DiscoverMedia,
} from "@/widgets/anilist/types";

const entry = {
  id: 1,
  kind: "anime",
  title: "Frieren",
  siteUrl: "https://anilist.co/anime/1",
  progress: 4,
  total: 28,
  behind: 2,
  status: "CURRENT",
};

describe("parseCachedCurrent", () => {
  it("restores a cache written from a live list response", () => {
    const parsed = parseCachedCurrent({ entries: [entry], scoreFormat: "POINT_100" });

    expect(parsed?.entries).toHaveLength(1);
    expect(parsed?.entries[0]?.title).toBe("Frieren");
  });

  it("still restores a cache written before the waiting totals were dropped", () => {
    const parsed = parseCachedCurrent({
      entries: [entry],
      waiting: { episodes: 3, chapters: 0 },
      scoreFormat: "POINT_100",
    });

    expect(parsed?.entries).toHaveLength(1);
  });

  it("falls back to the default score format when the cache predates it", () => {
    const parsed = parseCachedCurrent({ entries: [entry] });

    expect(parsed?.scoreFormat).toBe("POINT_10");
  });

  it("rejects a cache whose entries are malformed", () => {
    expect(parseCachedCurrent({ entries: [{ id: 1 }], scoreFormat: "POINT_100" })).toBeNull();
  });
});

function throughStorage(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe("persisted cache round-trip", () => {
  const fullEntry: Required<CurrentEntry> = {
    id: 1,
    kind: "anime",
    title: "Frieren",
    coverImage: "https://img.anilist.co/1.jpg",
    coverColor: "#1e5f74",
    siteUrl: "https://anilist.co/anime/1",
    progress: 4,
    total: 28,
    behind: 2,
    nextEpisode: { episode: 5, airingAt: 1782849601 },
    status: "CURRENT",
    score: 88,
    updatedAt: 1782849601,
  };

  it("reads back every field of a library entry", () => {
    const data: CurrentData = { entries: [fullEntry], scoreFormat: "POINT_100" };

    expect(parseCachedCurrent(throughStorage(data))).toEqual(data);
  });

  it("reads back every field of a discover card", () => {
    const data: Required<DiscoverMedia>[] = [
      {
        id: 2,
        kind: "manga",
        title: "Berserk",
        coverImage: "https://img.anilist.co/2.jpg",
        coverColor: "#2d1b1b",
        format: "MANGA",
        siteUrl: "https://anilist.co/manga/2",
        averageScore: 94,
        genres: ["Action", "Horror"],
        episodes: 374,
        listStatus: "PLANNING",
      },
    ];

    expect(parseCachedDiscover(throughStorage(data))).toEqual(data);
  });

  it("reads back every field of an inbox notification", () => {
    const data: Required<AnilistNotification>[] = [
      {
        id: 3,
        text: "Episode 5 of Frieren aired.",
        createdAt: "2026-07-01T00:00:00Z",
        imageUrl: "https://img.anilist.co/1.jpg",
        imageKind: "cover",
        url: "https://anilist.co/anime/1",
      },
    ];

    expect(parseCachedInbox(throughStorage(data))).toEqual(data);
  });

  it("reads back every field of an activity entry", () => {
    const data: Required<AnilistActivity>[] = [
      {
        id: 4,
        kind: "list",
        createdAt: 1782849601,
        userName: "someone",
        userAvatar: "https://img.anilist.co/avatar.jpg",
        text: "watched episode 5 of Frieren",
        mediaTitle: "Frieren",
        coverImage: "https://img.anilist.co/1.jpg",
        siteUrl: "https://anilist.co/activity/4",
        isLiked: true,
      },
    ];

    expect(parseCachedActivity(throughStorage(data))).toEqual(data);
  });
});
