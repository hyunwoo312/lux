// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { WeatherHourly } from "@/widgets/weather/components/WeatherHourly";
import type { WeatherHour } from "@/widgets/weather/types";

vi.mock("@/hooks/useElementSize", () => ({
  useElementSize: () => [() => undefined, { width: 320, height: 80 }],
}));
const hours: WeatherHour[] = [8, 9, 10].map((hour, index) => ({
  time: `2026-10-14T${String(hour).padStart(2, "0")}:00`,
  temperature: 18 + index,
  weatherCode: 1,
  precipitationProbability: index === 1 ? null : 0,
  windSpeed: index === 1 ? null : 10 + index,
}));

it("does not bridge missing wind samples and retains readable unavailable selection", () => {
  const { container } = render(
    <WeatherHourly
      hours={hours}
      metric="wind"
      selected={hours[1] ?? null}
      units={{ windSpeed: "kn" }}
      currentTime="2026-10-14T09:30"
      onSelect={() => {}}
    />,
  );
  expect(container.querySelectorAll('path[fill="none"][stroke="currentColor"]')).toHaveLength(2);
  expect(screen.getByRole("slider")).toHaveAttribute(
    "aria-valuetext",
    expect.stringContaining("Unavailable"),
  );
});

it("reaches the last sample with End and chooses the pointer's nearest hour", () => {
  const onSelect = vi.fn();
  render(
    <WeatherHourly
      hours={hours}
      metric="rain"
      selected={hours[0] ?? null}
      units={{ windSpeed: "mph" }}
      currentTime="2026-10-14T08:30"
      onSelect={onSelect}
    />,
  );
  const chart = screen.getByRole("slider");
  Object.defineProperty(chart, "setPointerCapture", { value: vi.fn() });
  fireEvent.keyDown(chart, { key: "End" });
  expect(onSelect).toHaveBeenLastCalledWith(hours[2]);
  fireEvent.pointerDown(chart, { clientX: 160, pointerId: 1 });
  expect(onSelect).toHaveBeenLastCalledWith(hours[1]);
});
