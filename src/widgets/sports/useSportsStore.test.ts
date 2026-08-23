import { beforeEach, describe, expect, it } from "vitest";
import { migrateInstance, useSportsStore, MAX_TEAMS } from "@/widgets/sports/useSportsStore";

const ID = "sports-1";
const store = () => useSportsStore.getState();
const data = () => useSportsStore.getState().byInstance[ID];

beforeEach(() => {
  useSportsStore.setState({ byInstance: {} });
});

describe("following", () => {
  it("keeps each league's teams separate, so switching league does not lose them", () => {
    store().toggleTeam(ID, "mlb", "NYY");
    store().toggleTeam(ID, "epl", "ARS");
    store().setLeague(ID, "epl");

    expect(data()?.following["mlb"]?.teams).toEqual(["NYY"]);
    expect(data()?.following["epl"]?.teams).toEqual(["ARS"]);
  });

  it("follows a team on one press and drops it on the next", () => {
    store().toggleTeam(ID, "mlb", "NYY");
    expect(data()?.following["mlb"]?.teams).toEqual(["NYY"]);

    store().toggleTeam(ID, "mlb", "NYY");
    expect(data()?.following["mlb"]?.teams).toEqual([]);
  });

  it("refuses to follow past the cap", () => {
    const full = Array.from({ length: MAX_TEAMS }, (_, index) => `T${index}`);
    for (const team of full) store().toggleTeam(ID, "mlb", team);
    store().toggleTeam(ID, "mlb", "EXTRA");

    expect(data()?.following["mlb"]?.teams).toEqual(full);
  });

  it("follows teams in the league they belong to, not the one on screen", () => {
    store().setLeague(ID, "mlb");
    store().toggleTeam(ID, "epl", "ARS");

    expect(data()?.following["epl"]?.teams).toEqual(["ARS"]);
    expect(data()?.following["mlb"]).toBeUndefined();
  });
});

describe("migrateInstance", () => {
  it("moves a v1 widget's flat team list under the league it was following", () => {
    const migrated = migrateInstance({
      leagueId: "mlb",
      teams: ["NYY", "BOS"],
      states: ["in"],
      window: "today",
    }) as { leagueId: string; following: Record<string, { teams: string[] }>; tab: string };

    expect(migrated.leagueId).toBe("mlb");
    expect(migrated.following["mlb"]?.teams).toEqual(["NYY", "BOS"]);
    expect(migrated.tab).toBe("discover");
  });

  it("leaves a widget that followed nobody with no following at all", () => {
    const migrated = migrateInstance({ leagueId: "nba", teams: [] }) as {
      following: Record<string, unknown>;
    };
    expect(migrated.following).toEqual({});
  });

  it("passes through anything that is not a v1 widget", () => {
    expect(migrateInstance("nonsense")).toBe("nonsense");
    expect(migrateInstance({})).toEqual({});
  });
});

describe("merge tolerance", () => {
  const merge = useSportsStore.persist.getOptions().merge;
  const mergeInto = (persisted: unknown) =>
    merge?.(persisted, { ...useSportsStore.getState(), byInstance: {} }) as ReturnType<
      typeof useSportsStore.getState
    >;

  const stored = {
    tab: "favorites",
    collapsed: [],
    leagueId: "epl",
    following: { epl: { teams: ["ARS"] } },
    states: ["in"],
    window: "today",
  };

  it("keeps the other widgets when one of them is unreadable", () => {
    const merged = mergeInto({ byInstance: { a: stored, b: 5, c: stored } });
    expect(Object.keys(merged.byInstance)).toEqual(["a", "c"]);
  });

  it("keeps the followed teams when one setting is unreadable", () => {
    const merged = mergeInto({ byInstance: { a: { ...stored, leagueId: "gone" } } });

    expect(merged.byInstance["a"]?.leagueId).toBe("mlb");
    expect(merged.byInstance["a"]?.following["epl"]?.teams).toEqual(["ARS"]);
  });

  it("drops only the unreadable league from the following map", () => {
    const merged = mergeInto({
      byInstance: { a: { ...stored, following: { epl: { teams: ["ARS"] }, bad: 7 } } },
    });

    expect(Object.keys(merged.byInstance["a"]?.following ?? {})).toEqual(["epl"]);
  });

  it("starts empty rather than throwing on a blob with no widgets at all", () => {
    expect(mergeInto({}).byInstance).toEqual({});
    expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
  });
});
