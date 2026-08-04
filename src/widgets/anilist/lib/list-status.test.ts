import { describe, expect, it } from "vitest";
import { emptyListMessage, listFilterLabel, statusesFor } from "@/widgets/anilist/lib/list-status";

describe("statusesFor", () => {
  it("treats rewatching as in progress", () => {
    expect(statusesFor("progress")).toEqual(["CURRENT", "REPEATING"]);
  });

  it("maps each filter to its AniList statuses", () => {
    expect(statusesFor("planned")).toEqual(["PLANNING"]);
    expect(statusesFor("dropped")).toEqual(["DROPPED"]);
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
