import { describe, expect, it } from "vitest";
import { Moon, Sun } from "lucide-react";
import { isPrecipitationCode, wmoInfo } from "@/widgets/weather/lib/wmo";

describe("wmoInfo", () => {
  it("maps clear sky to a sun by day and a moon by night", () => {
    expect(wmoInfo(0, true).icon).toBe(Sun);
    expect(wmoInfo(0, false).icon).toBe(Moon);
    expect(wmoInfo(0, true).label).toBe("Clear");
  });

  it("flags precipitation codes and labels them", () => {
    expect(wmoInfo(65, true)).toMatchObject({ label: "Rain", precipitation: true });
    expect(wmoInfo(95, true)).toMatchObject({ label: "Thunderstorm", precipitation: true });
    expect(wmoInfo(75, true)).toMatchObject({ label: "Snow", precipitation: true });
  });

  it("treats dry conditions as non-precipitation", () => {
    expect(wmoInfo(0, true).precipitation).toBe(false);
    expect(wmoInfo(3, true).precipitation).toBe(false);
    expect(wmoInfo(45, true)).toMatchObject({ label: "Fog", precipitation: false });
  });

  it("falls back to overcast for unknown codes", () => {
    expect(wmoInfo(999, true).label).toBe("Overcast");
  });
});

describe("isPrecipitationCode", () => {
  it("returns true only for precipitation codes", () => {
    expect(isPrecipitationCode(61)).toBe(true);
    expect(isPrecipitationCode(80)).toBe(true);
    expect(isPrecipitationCode(2)).toBe(false);
    expect(isPrecipitationCode(999)).toBe(false);
  });
});
