import { useState } from "react";
import { CandlestickChart, LineChart, GitCompareArrows, SlidersHorizontal } from "lucide-react";
import { ConfigSegmented } from "@/components/config/Config";
import { IconActionButton } from "@/components/IconActionButton";
import { ErrorState } from "@/components/StateMessage";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useNow } from "@/hooks/useNow";
import { Skeleton } from "@/components/ui/skeleton";
import { TYPE } from "@/lib/type";
import { clamp01, cn } from "@/lib/utils";
import {
  formatCountdown,
  formatExchangeTime,
  formatNumber,
  formatPrice,
  formatSigned,
  formatVolume,
} from "@/widgets/stocks/lib/format";
import {
  changeOf,
  changeTone,
  directionOf,
  extendedSession,
  isAlwaysOpen,
  marketState,
  referencePrice,
} from "@/widgets/stocks/lib/quote";
import { useQuote } from "@/widgets/stocks/hooks/useQuote";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { ChangeValue } from "@/widgets/stocks/components/ChangeValue";
import { PriceChart } from "@/widgets/stocks/components/PriceChart";
import { RangeChips } from "@/widgets/stocks/components/RangeChips";
import { CompareChart } from "@/widgets/stocks/components/CompareChart";
import { StockRemoveButton } from "@/widgets/stocks/components/StockRemoveButton";
import { RANGE_LABEL, type Quote, type StockRange } from "@/widgets/stocks/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className={TYPE.rowMeta}>{label}</dt>
      <dd className="text-ink truncate text-caption tabular-nums slashed-zero">{value}</dd>
    </div>
  );
}

function RangeMeter({
  label,
  low,
  high,
  value,
  priceHint,
}: {
  label: string;
  low: number | null;
  high: number | null;
  value: number;
  priceHint: number;
}) {
  if (low == null || high == null) return null;
  const fraction = high > low ? clamp01((value - low) / (high - low)) : 0.5;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className={TYPE.rowMeta}>{label}</dt>
      <dd className="flex flex-col gap-1">
        <div className="bg-foreground/10 relative h-1 rounded-full">
          <span
            className="
              bg-ink absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full
            "
            style={{ left: `${fraction * 100}%` }}
          />
        </div>
        <div className="text-ink-3 flex justify-between text-micro tabular-nums slashed-zero">
          <span>{formatNumber(low, priceHint)}</span>
          <span>{formatNumber(high, priceHint)}</span>
        </div>
      </dd>
    </div>
  );
}

function MarketStatus({ data }: { data: Quote }) {
  const clock24h = useAppSettingsStore((state) => state.clock24h);
  const now = useNow().getTime();
  const state = isAlwaysOpen(data) ? "open" : marketState(data, now);
  const opensInMs = data.sessionStart != null ? data.sessionStart * 1000 - now : null;
  const asOf =
    data.asOf != null ? formatExchangeTime(data.asOf, data.exchangeTimezone, !clock24h) : null;
  const venue = data.exchange ? `${data.exchange} · ` : "";

  return (
    <span className="text-ink-3 flex min-w-0 items-center gap-1.5 text-caption">
      {state === "open" ? (
        <>
          <span className="bg-success size-1.5 shrink-0 rounded-full" />
          <span className="truncate">{data.exchange ?? "Market"} · Open</span>
        </>
      ) : state === "closed" && opensInMs != null && opensInMs > 0 ? (
        <span className="truncate">
          {venue}Opens in {formatCountdown(opensInMs)}
        </span>
      ) : asOf ? (
        <span className="truncate">
          {venue}
          {state === "closed" ? "Closed" : "As of"} · {asOf}
        </span>
      ) : (
        <span className="truncate">
          {venue}
          {state === "closed" ? "Closed" : ""}
        </span>
      )}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="min-h-16 flex-1" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    </div>
  );
}

type ChartControls = {
  volume: boolean;
  average: "none" | "sma" | "ema";
  extendedHours: boolean;
  compare: boolean;
  tools: boolean;
};

function DetailBody({
  data,
  range,
  controls,
  onControlsChange,
  daily,
}: {
  data: Quote;
  range: StockRange;
  controls: ChartControls;
  onControlsChange: (patch: Partial<ChartControls>) => void;
  daily: Quote | null;
}) {
  const clock24h = useAppSettingsStore((state) => state.clock24h);
  const { volume, average, extendedHours, compare, tools } = controls;
  const instanceId = useWidgetInstanceId();
  const changeMode = useStocks((d) => d.changeMode);
  const chartStyle = useStocks((d) => d.chartStyle);
  const setRange = useStocksStore((s) => s.setRange);
  const setChartStyle = useStocksStore((s) => s.setChartStyle);
  const now = useNow().getTime();

  const reference = referencePrice(data, range);
  const { change, percent } = changeOf(data.price, reference);
  const direction = directionOf(change);
  const extended = extendedSession(data, now);
  const candles = chartStyle === "candle";

  return (
    <div className="scroll-fade flex h-full min-h-0 flex-col gap-2 overflow-x-hidden overflow-y-auto">
      <div className="flex shrink-0 flex-col gap-1 pr-8">
        <div className="flex items-baseline gap-2">
          <span className={cn(TYPE.title, "shrink-0")}>{data.symbol}</span>
          <span className={cn(TYPE.rowMeta, "min-w-0 truncate")}>{data.name}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-ink text-heading leading-none font-semibold tabular-nums slashed-zero">
            {formatPrice(data.price, data.currency, data.priceHint)}
          </span>
          <ChangeValue change={change} percent={percent} mode={changeMode} variant="chip" />
          {range !== "1d" ? <span className={TYPE.rowMeta}>over {RANGE_LABEL[range]}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <MarketStatus data={data} />
          {extended ? (
            <span className="flex items-baseline gap-1 text-caption">
              <span className="text-ink-3">
                {extended.kind === "pre" ? "Pre-market" : "After hours"}
              </span>
              <span className="text-ink tabular-nums slashed-zero">
                {formatNumber(extended.price, data.priceHint)}
              </span>
              <span
                className={cn(
                  "tabular-nums slashed-zero",
                  changeTone(directionOf(extended.change)),
                )}
              >
                {formatSigned(extended.percent)}%
              </span>
            </span>
          ) : null}
        </div>
        <p className="text-ink-3 text-micro">
          Yahoo Finance · may be delayed
          {data.asOf != null
            ? ` · As of ${formatExchangeTime(data.asOf, data.exchangeTimezone, !clock24h, true)}`
            : " · Quote time unavailable"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <RangeChips value={range} onChange={(next) => setRange(instanceId, next)} />
        </div>
        {!compare && (
          <IconActionButton
            icon={candles ? CandlestickChart : LineChart}
            label={candles ? "Show a line chart" : "Show candles"}
            tooltip={candles ? "Line chart" : "Candlesticks"}
            onClick={() => setChartStyle(instanceId, candles ? "line" : "candle")}
          />
        )}
        <IconActionButton
          icon={GitCompareArrows}
          label={compare ? "Show single-symbol chart" : "Compare symbols"}
          tooltip={compare ? "Single symbol" : "Compare"}
          onClick={() => onControlsChange({ compare: !compare })}
        />
        {!compare && (
          <IconActionButton
            icon={SlidersHorizontal}
            label={tools ? "Hide chart controls" : "Show chart controls"}
            tooltip="Chart controls"
            onClick={() => onControlsChange({ tools: !tools })}
          />
        )}
      </div>
      {tools && !compare && (
        <div className="bg-foreground/5 flex shrink-0 flex-wrap items-center gap-2 rounded-lg p-2">
          <ConfigSegmented
            label="Chart volume"
            value={volume ? "show" : "hide"}
            options={[
              { value: "show", label: "Volume" },
              { value: "hide", label: "No volume" },
            ]}
            onChange={(value) => onControlsChange({ volume: value === "show" })}
          />
          <ConfigSegmented
            label="Moving average"
            value={average}
            options={[
              { value: "none", label: "None" },
              { value: "sma", label: "SMA 20" },
              { value: "ema", label: "EMA 20" },
            ]}
            onChange={(average) => onControlsChange({ average })}
          />
          {range === "1d" && (
            <ConfigSegmented
              label="Chart session"
              value={extendedHours ? "extended" : "regular"}
              options={[
                { value: "regular", label: "Regular" },
                { value: "extended", label: "Extended" },
              ]}
              onChange={(value) => onControlsChange({ extendedHours: value === "extended" })}
            />
          )}
          <span className="text-ink-3 text-micro">
            {average !== "none" ? "Average uses 20 source bars. " : ""}Shaded bars are outside the
            regular session.
          </span>
        </div>
      )}
      {compare ? (
        <CompareChart key={`${data.symbol}:${range}`} symbol={data.symbol} range={range} />
      ) : (
        <>
          <p className="text-ink-3 text-micro">
            {range === "1d"
              ? "5-minute"
              : range === "5d"
                ? "30-minute"
                : range === "5y"
                  ? "Weekly"
                  : "Daily"}{" "}
            source bars{candles ? " · candles grouped to fit" : ""}
            {extendedHours && range === "1d" ? " · extended hours" : ""}
            {average !== "none" ? ` · ${average.toUpperCase()} 20` : ""}
          </p>
          <PriceChart
            key={`${data.symbol}:${range}:${extendedHours}`}
            bars={
              extendedHours && range === "1d"
                ? [...data.bars, ...(data.extendedBars ?? [])].sort((a, b) => a.time - b.time)
                : data.bars
            }
            direction={direction}
            baseline={reference}
            style={chartStyle}
            range={range}
            priceHint={data.priceHint}
            timeZone={data.exchangeTimezone}
            dividends={data.dividends}
            className="min-h-32 flex-1"
            showVolume={volume}
            average={average}
            session={
              extendedHours &&
              range === "1d" &&
              data.sessionStart != null &&
              data.sessionEnd != null
                ? { regularTimes: data.bars.map((bar) => bar.time) }
                : undefined
            }
          />
          {data.bars.length === 0 && (
            <p role="status" className="text-ink-3 text-caption">
              No regular-session chart history available.
            </p>
          )}
        </>
      )}

      {!compare && (
        <dl className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-2">
          <RangeMeter
            label="Day range"
            low={data.dayLow}
            high={data.dayHigh}
            value={data.price}
            priceHint={data.priceHint}
          />
          <RangeMeter
            label="52-week range"
            low={data.week52Low}
            high={data.week52High}
            value={data.price}
            priceHint={data.priceHint}
          />
          <Stat
            label="Prev close"
            value={daily ? formatNumber(daily.previousClose, daily.priceHint) : "—"}
          />
          <Stat label="Volume" value={data.volume != null ? formatVolume(data.volume) : "—"} />
        </dl>
      )}
    </div>
  );
}

type StockDetailProps = {
  symbol: string;
  onRemove?: () => void;
};

export function StockDetail({ symbol, onRemove }: StockDetailProps) {
  const [controls, setControls] = useState<ChartControls>({
    volume: true,
    average: "none",
    extendedHours: false,
    compare: false,
    tools: false,
  });
  const { state, data, refresh, isRefreshing, range, freshness } = useQuote(symbol, {
    focused: true,
  });
  const daily = useQuote(symbol, { range: "1d" });

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {onRemove && (
        <StockRemoveButton
          symbol={symbol}
          onRemove={onRemove}
          className="absolute top-0 right-0 z-10"
        />
      )}
      {data && freshness.status !== "current" && (
        <p role="status" className="text-warning mb-1 shrink-0 pr-8 text-caption">
          Showing saved quote. Refresh to check for updates.
        </p>
      )}
      {data ? (
        <DetailBody
          key={symbol}
          data={data}
          range={range}
          controls={controls}
          daily={daily.data}
          onControlsChange={(patch) => setControls((current) => ({ ...current, ...patch }))}
        />
      ) : state.status === "error" ? (
        <ErrorState
          error={state.error}
          service="Yahoo Finance"
          subject={symbol}
          onRetry={refresh}
          retrying={isRefreshing}
        />
      ) : (
        <DetailSkeleton />
      )}
    </div>
  );
}
