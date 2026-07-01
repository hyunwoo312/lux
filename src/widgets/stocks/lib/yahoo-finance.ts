import { z } from "zod";
import type { Quote, StockRange, SymbolSearchResult } from "@/widgets/stocks/types";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const REQUEST_TIMEOUT_MS = 10_000;
const SEARCHABLE_TYPES = new Set(["EQUITY", "ETF", "INDEX"]);
const RANGE_INTERVAL: Record<StockRange, string> = {
  "1d": "5m",
  "5d": "30m",
  "1mo": "1d",
  "6mo": "1d",
  "1y": "1wk",
};

function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function fetchYahoo(path: string, signal?: AbortSignal): Promise<unknown> {
  let lastError: Error | undefined;
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, { signal: withTimeout(signal) });
      if (!response.ok) {
        lastError = new Error(`Yahoo request failed (${response.status})`);
        continue;
      }
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error instanceof Error ? error : new Error("Yahoo request failed");
    }
  }
  throw lastError ?? new Error("Yahoo request failed");
}

const chartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({
            symbol: z.string(),
            currency: z.string().optional(),
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
            currentTradingPeriod: z
              .object({
                regular: z.object({ start: z.number(), end: z.number() }).optional(),
              })
              .optional(),
          }),
          timestamp: z.array(z.number()).optional(),
          indicators: z
            .object({
              quote: z.array(z.object({ close: z.array(z.number().nullable()).optional() })),
            })
            .optional(),
        }),
      )
      .nullable()
      .optional(),
  }),
});

export function quoteFromChart(raw: unknown): Quote {
  const parsed = chartSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected quote response");
  const result = parsed.data.chart.result?.[0];
  if (!result) throw new Error("Quote data unavailable");
  const { meta } = result;
  const closes = result.indicators?.quote[0]?.close ?? [];
  const times = result.timestamp ?? [];
  const series: number[] = [];
  const timestamps: number[] = [];
  closes.forEach((value, index) => {
    if (value != null) {
      series.push(value);
      timestamps.push(times[index] ?? 0);
    }
  });
  return {
    symbol: meta.symbol,
    name: meta.shortName ?? meta.longName ?? meta.symbol,
    price: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
    currency: meta.currency ?? "USD",
    asOf: meta.regularMarketTime != null ? meta.regularMarketTime * 1000 : null,
    sessionStart: meta.currentTradingPeriod?.regular?.start ?? null,
    sessionEnd: meta.currentTradingPeriod?.regular?.end ?? null,
    series,
    timestamps,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    week52High: meta.fiftyTwoWeekHigh ?? null,
    week52Low: meta.fiftyTwoWeekLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
  };
}

const searchSchema = z.object({
  quotes: z
    .array(
      z.object({
        symbol: z.string(),
        shortname: z.string().optional(),
        longname: z.string().optional(),
        exchDisp: z.string().optional(),
        quoteType: z.string().optional(),
      }),
    )
    .optional(),
});

export function symbolsFromSearch(raw: unknown): SymbolSearchResult[] {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected symbol search response");
  return (parsed.data.quotes ?? [])
    .filter((quote) => quote.quoteType != null && SEARCHABLE_TYPES.has(quote.quoteType))
    .map((quote) => ({
      symbol: quote.symbol,
      name: quote.shortname ?? quote.longname ?? quote.symbol,
      exchange: quote.exchDisp ?? "",
    }));
}

export async function fetchQuote(
  symbol: string,
  range: StockRange,
  signal?: AbortSignal,
): Promise<Quote> {
  const data = await fetchYahoo(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${RANGE_INTERVAL[range]}`,
    signal,
  );
  return quoteFromChart(data);
}

export async function searchSymbols(
  query: string,
  signal?: AbortSignal,
): Promise<SymbolSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const data = await fetchYahoo(`/v1/finance/search?q=${encodeURIComponent(trimmed)}`, signal);
  return symbolsFromSearch(data);
}

const quoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  previousClose: z.number(),
  currency: z.string(),
  asOf: z.number().nullable(),
  sessionStart: z.number().nullable().default(null),
  sessionEnd: z.number().nullable().default(null),
  series: z.array(z.number()),
  timestamps: z.array(z.number()).default([]),
  dayHigh: z.number().nullable().default(null),
  dayLow: z.number().nullable().default(null),
  week52High: z.number().nullable().default(null),
  week52Low: z.number().nullable().default(null),
  volume: z.number().nullable().default(null),
  exchange: z.string().nullable().default(null),
});

export function parseCachedQuote(raw: unknown): Quote | null {
  const result = quoteSchema.safeParse(raw);
  if (!result.success) return null;
  if (result.data.timestamps.length !== result.data.series.length) return null;
  return result.data;
}
