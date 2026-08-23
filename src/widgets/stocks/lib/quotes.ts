import { z } from "zod";
import { fetchYahoo } from "@/widgets/stocks/lib/yahooApi";
import {
  INSTRUMENT_TYPES,
  type Dividend,
  type PriceBar,
  type Quote,
  type StockRange,
} from "@/widgets/stocks/types";

const RANGE_INTERVAL: Record<StockRange, string> = {
  "1d": "5m",
  "5d": "30m",
  "1mo": "1d",
  "6mo": "1d",
  ytd: "1d",
  "1y": "1d",
  "5y": "1wk",
};

const instrumentTypeSchema = z.enum(INSTRUMENT_TYPES).nullable().catch(null);

const chartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({
            symbol: z.string(),
            currency: z.string().optional(),
            priceHint: z.number().optional(),
            regularMarketPrice: z.number(),
            chartPreviousClose: z.number().optional(),
            previousClose: z.number().optional(),
            regularMarketTime: z.number().optional(),
            shortName: z.string().optional(),
            longName: z.string().optional(),
            regularMarketDayHigh: z.number().optional(),
            regularMarketDayLow: z.number().optional(),
            fiftyTwoWeekHigh: z.number().optional(),
            fiftyTwoWeekLow: z.number().optional(),
            regularMarketVolume: z.number().optional(),
            fullExchangeName: z.string().optional(),
            exchangeName: z.string().optional(),
            exchangeTimezoneName: z.string().optional(),
            instrumentType: instrumentTypeSchema.optional(),
            currentTradingPeriod: z
              .object({
                pre: z.object({ start: z.number(), end: z.number() }).optional(),
                regular: z.object({ start: z.number(), end: z.number() }).optional(),
                post: z.object({ start: z.number(), end: z.number() }).optional(),
              })
              .optional(),
          }),
          timestamp: z.array(z.number()).optional(),
          events: z
            .object({
              dividends: z.record(z.string(), z.object({ amount: z.number(), date: z.number() })),
            })
            .partial()
            .optional(),
          indicators: z
            .object({
              quote: z.array(
                z.object({
                  close: z.array(z.number().nullable()).optional(),
                  open: z.array(z.number().nullable()).optional(),
                  high: z.array(z.number().nullable()).optional(),
                  low: z.array(z.number().nullable()).optional(),
                  volume: z.array(z.number().nullable()).optional(),
                }),
              ),
            })
            .optional(),
        }),
      )
      .nullable()
      .optional(),
  }),
});

export function quoteFromChart(raw: unknown, range: StockRange): Quote {
  const parsed = chartSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected quote response");
  const result = parsed.data.chart.result?.[0];
  if (!result) throw new Error("Quote data unavailable");
  const { meta } = result;
  const series = result.indicators?.quote[0];
  const closes = series?.close ?? [];
  const times = result.timestamp ?? [];
  const preStart = meta.currentTradingPeriod?.pre?.start ?? null;
  const regStart = meta.currentTradingPeriod?.regular?.start ?? null;
  const regEnd = meta.currentTradingPeriod?.regular?.end ?? null;
  const postEnd = meta.currentTradingPeriod?.post?.end ?? null;
  const splitExtended = range === "1d" && regStart != null && regEnd != null;

  const bars: PriceBar[] = [];
  let preMarketPrice: number | null = null;
  let postMarketPrice: number | null = null;

  closes.forEach((close, index) => {
    if (close == null) return;
    const time = times[index] ?? 0;
    if (splitExtended && time < regStart) {
      if (preStart != null && time >= preStart) preMarketPrice = close;
      return;
    }
    if (splitExtended && time >= regEnd) {
      if (postEnd != null && time < postEnd) postMarketPrice = close;
      return;
    }
    bars.push({
      time,
      close,
      open: series?.open?.[index] ?? close,
      high: series?.high?.[index] ?? close,
      low: series?.low?.[index] ?? close,
      volume: series?.volume?.[index] ?? null,
    });
  });

  const dividends: Dividend[] = Object.values(result.events?.dividends ?? {})
    .map((entry) => ({ time: entry.date, amount: entry.amount }))
    .sort((a, b) => a.time - b.time);

  return {
    symbol: meta.symbol,
    name: meta.shortName ?? meta.longName ?? meta.symbol,
    price: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
    currency: meta.currency ?? "USD",
    priceHint: meta.priceHint ?? 2,
    asOf: meta.regularMarketTime != null ? meta.regularMarketTime * 1000 : null,
    sessionStart: regStart,
    sessionEnd: regEnd,
    preMarketPrice,
    postMarketPrice,
    preMarketStart: splitExtended ? preStart : null,
    postMarketEnd: splitExtended ? postEnd : null,
    bars,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    week52High: meta.fiftyTwoWeekHigh ?? null,
    week52Low: meta.fiftyTwoWeekLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
    exchangeTimezone: meta.exchangeTimezoneName ?? null,
    instrumentType: meta.instrumentType ?? null,
    dividends,
  };
}

export async function fetchQuote(
  symbol: string,
  range: StockRange,
  signal?: AbortSignal,
): Promise<Quote> {
  const prePost = range === "1d" ? "&includePrePost=true" : "";
  const raw = await fetchYahoo(
    `/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${range}&interval=${RANGE_INTERVAL[range]}&events=div${prePost}`,
    signal,
  );
  return quoteFromChart(raw, range);
}

const barSchema = z.object({
  time: z.number(),
  close: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  volume: z.number().nullable(),
});

const cachedQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  previousClose: z.number(),
  currency: z.string(),
  priceHint: z.number(),
  asOf: z.number().nullable(),
  sessionStart: z.number().nullable(),
  sessionEnd: z.number().nullable(),
  preMarketPrice: z.number().nullable(),
  postMarketPrice: z.number().nullable(),
  preMarketStart: z.number().nullable(),
  postMarketEnd: z.number().nullable(),
  bars: z.array(barSchema),
  dayHigh: z.number().nullable(),
  dayLow: z.number().nullable(),
  week52High: z.number().nullable(),
  week52Low: z.number().nullable(),
  volume: z.number().nullable(),
  exchange: z.string().nullable(),
  exchangeTimezone: z.string().nullable(),
  instrumentType: z.enum(INSTRUMENT_TYPES).nullable(),
  dividends: z.array(z.object({ time: z.number(), amount: z.number() })),
});

export function parseCachedQuote(raw: unknown): Quote | null {
  const result = cachedQuoteSchema.safeParse(raw);
  return result.success ? result.data : null;
}
