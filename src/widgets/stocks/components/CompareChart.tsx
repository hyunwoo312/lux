import { useState } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { ConfigMultiToggle } from "@/components/config/Config";
import { useElementSize } from "@/hooks/useElementSize";
import { chartGeometry, linePath } from "@/lib/chart";
import { cn } from "@/lib/utils";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useSparkResource } from "@/widgets/stocks/hooks/useSparks";
import { compareSeries } from "@/widgets/stocks/lib/analysis";
import { changeTone, directionOf } from "@/widgets/stocks/lib/quote";
import { formatSigned, formatChartTime } from "@/widgets/stocks/lib/format";
import type { StockRange } from "@/widgets/stocks/types";

const STROKES = [undefined, "6 3", "2 3", "8 3 2 3"];

export function CompareChart({ symbol, range }: { symbol: string; range: StockRange }) {
  const clock24h = useAppSettingsStore((state) => state.clock24h);
  const symbols = useStocks((d) => d.symbols);
  const instanceId = useWidgetInstanceId();
  const comparison = useStocksStore((state) => state.comparisonByInstance[instanceId]);
  const setComparison = useStocksStore((state) => state.setComparisonSymbols);
  const choices = [...new Set([symbol, ...symbols, "SPY", "QQQ"])];
  const valid = comparison?.filter((entry) => choices.includes(entry));
  const selected = valid && valid.length >= 2 ? valid : choices.slice(0, 2);
  const { map, state, refresh, freshness } = useSparkResource(selected, range);
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const [inspection, setActive] = useState<number | null>(null);
  const available = selected.flatMap((entry) => (map?.[entry] ? [map[entry]] : []));
  const lines = available.length === selected.length ? compareSeries(available) : [];
  const geometry = chartGeometry(
    lines.flatMap((line) => line.points.map((point) => point.close)),
    Math.max(0, width - 42),
    Math.max(0, height - 24),
    { baseline: 0 },
  );
  const first = lines[0]?.points[0];
  const last = lines[0]?.points.at(-1);
  const timeSpan = first && last ? last.time - first.time : 0;
  const xFor = (time: number) =>
    first && timeSpan > 0 ? ((time - first.time) / timeSpan) * (width - 42) : 0;
  const count = lines[0]?.points.length ?? 0;
  const active = inspection != null && count > 0 ? Math.min(inspection, count - 1) : null;
  return (
    <div className="flex flex-1 shrink-0 flex-col gap-2">
      <ConfigMultiToggle
        label="Compare symbols"
        values={selected}
        options={choices.map((value) => ({ value, label: value }))}
        onChange={(next) => setComparison(instanceId, next)}
        maxSelected={4}
        minSelected={2}
      />
      <p className="text-ink-3 text-micro">
        Price returns from the first common bar · no currency conversion
      </p>
      <div ref={ref} className="relative min-h-32 flex-1">
        {geometry && first && last ? (
          <>
            <svg
              className="absolute inset-0 size-full"
              role="img"
              aria-label={`Compare ${selected.join(", ")} over common history`}
            >
              <line
                x1={0}
                x2={width - 42}
                y1={geometry.yFor(0)}
                y2={geometry.yFor(0)}
                className="stroke-background"
                strokeWidth={3}
              />
              <line
                x1={0}
                x2={width - 42}
                y1={geometry.yFor(0)}
                y2={geometry.yFor(0)}
                className="stroke-ink-3"
                strokeDasharray="3 3"
              />
              {lines.map((line, index) => (
                <g key={line.symbol}>
                  <path
                    d={linePath(
                      line.points.map((point) => ({
                        x: xFor(point.time),
                        y: geometry.yFor(point.close),
                      })),
                    )}
                    fill="none"
                    className="stroke-background"
                    strokeWidth={4}
                    strokeDasharray={STROKES[index]}
                  />
                  <path
                    d={linePath(
                      line.points.map((point) => ({
                        x: xFor(point.time),
                        y: geometry.yFor(point.close),
                      })),
                    )}
                    fill="none"
                    className={cn("stroke-current", index === 0 ? "text-primary" : "text-ink")}
                    strokeWidth={1.75}
                    strokeDasharray={STROKES[index]}
                  />
                </g>
              ))}
              {active != null && lines[0]?.points[active] && (
                <>
                  <line
                    x1={xFor(lines[0].points[active].time)}
                    x2={xFor(lines[0].points[active].time)}
                    y1={0}
                    y2={height - 24}
                    className="stroke-background"
                    strokeWidth={3}
                  />
                  <line
                    x1={xFor(lines[0].points[active].time)}
                    x2={xFor(lines[0].points[active].time)}
                    y1={0}
                    y2={height - 24}
                    className="stroke-ink-3"
                    strokeWidth={1}
                  />
                </>
              )}
              {[geometry.max, 0, geometry.min].map((value, index) => (
                <text
                  key={index}
                  x={width - 38}
                  y={Math.max(10, geometry.yFor(value))}
                  className="fill-ink-2 text-micro"
                >
                  {formatSigned(value, 1)}%
                </text>
              ))}
              <text x={0} y={height - 3} className="fill-ink-2 text-micro">
                {formatChartTime(first.time, range, !clock24h, null)}
              </text>
              <text
                x={width - 42}
                y={height - 3}
                textAnchor="end"
                className="fill-ink-2 text-micro"
              >
                {formatChartTime(last.time, range, !clock24h, null)}
              </text>
            </svg>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Inspect comparison"
              aria-valuemin={0}
              aria-valuemax={count - 1}
              aria-valuenow={active ?? count - 1}
              aria-valuetext={lines
                .map(
                  (line) =>
                    `${line.symbol} ${formatSigned(line.points[active ?? count - 1]?.close ?? 0)}%`,
                )
                .join(", ")}
              className="focus-ring absolute inset-0 rounded-md"
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setActive(
                  Math.max(
                    0,
                    Math.min(
                      count - 1,
                      Math.round(
                        ((event.clientX - rect.left) / Math.max(1, width - 42)) * (count - 1),
                      ),
                    ),
                  ),
                );
              }}
              onPointerLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  if (active != null) {
                    event.stopPropagation();
                    setActive(null);
                  }
                  return;
                }
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? count - 1
                      : event.key === "ArrowLeft"
                        ? (active ?? count - 1) - 1
                        : event.key === "ArrowRight"
                          ? (active ?? count - 1) + 1
                          : null;
                if (next != null) {
                  event.preventDefault();
                  setActive(Math.max(0, Math.min(count - 1, next)));
                }
              }}
            />
          </>
        ) : (
          <div
            className="text-ink-3 flex h-full items-center justify-center p-2 text-caption"
            role="status"
          >
            {state.status === "loading" ? (
              "Loading comparison…"
            ) : state.status === "error" ? (
              <button
                type="button"
                onClick={refresh}
                className="focus-ring cursor-pointer rounded-md p-2"
              >
                Comparison unavailable · Retry
              </button>
            ) : (
              "No overlapping history for these symbols."
            )}
          </div>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {lines.map((line, index) => {
          const value = line.points[active ?? count - 1]?.close ?? 0;
          return (
            <li key={line.symbol} className="text-ink flex items-baseline gap-1 text-caption">
              <span className="text-ink-3">
                {index + 1}
                {index > 0 ? " dashed" : " solid"}
              </span>
              <span className="font-semibold">{line.symbol}</span>
              <span className={cn("tabular-nums", changeTone(directionOf(value)))}>
                {formatSigned(value)}%
              </span>
            </li>
          );
        })}
      </ul>
      {active != null && lines[0]?.points[active] && (
        <p className="text-ink-3 text-micro">
          {formatChartTime(lines[0].points[active].time, range, !clock24h, null)}
        </p>
      )}
      {freshness.status !== "current" && lines.length > 0 && (
        <p role="status" className="text-warning text-caption">
          Showing saved comparison data.
        </p>
      )}
    </div>
  );
}
