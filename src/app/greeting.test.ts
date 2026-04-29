import { getGreetingCopy, getGreetingPeriod } from "@/app/greeting";

describe("greeting", () => {
  it.each([
    ["lateNight", "2026-06-13T04:30:00"],
    ["morning", "2026-06-13T08:00:00"],
    ["afternoon", "2026-06-13T14:00:00"],
    ["evening", "2026-06-13T19:00:00"],
    ["lateNight", "2026-06-13T22:30:00"],
  ] as const)("maps %s to %s", (period, isoDate) => {
    expect(getGreetingPeriod(new Date(isoDate))).toBe(period);
  });

  it("uses the late-night title", () => {
    const greeting = getGreetingCopy(new Date("2026-06-13T23:30:00"), () => 0);
    expect(greeting.title).toBe("Still Working?");
  });

  it("selects a subtitle from the active period by random index", () => {
    const greeting = getGreetingCopy(new Date("2026-06-13T08:00:00"), () => 0.34);
    expect(greeting.title).toBe("Good Morning");
    expect(greeting.subtitle).toBe("Get clear first, then get moving.");
  });

  it("does not repeat the previous subtitle when another option exists", () => {
    const greeting = getGreetingCopy(
      new Date("2026-06-13T08:00:00"),
      () => 0,
      "Pick the thing that makes the day easier.",
    );
    expect(greeting.subtitle).toBe("Start with one thing that actually matters.");
  });

  it("includes weekday-aware subtitles", () => {
    const greeting = getGreetingCopy(new Date("2026-06-15T08:00:00"), () => 0.99);
    expect(greeting.subtitle).toBe("Ease into the week with one clear move.");
  });
});
