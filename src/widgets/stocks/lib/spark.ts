import { z } from "zod";
import { fetchYahoo } from "@/widgets/stocks/lib/yahooApi";
import type { SparkSeries, StockRange } from "@/widgets/stocks/types";

const SPARK_INTERVAL: Record<StockRange, string> = {
  "1d": "5m",
  "5d": "30m",
  "1mo": "1d",
  "6mo": "1d",
  ytd: "1d",
  "1y": "1d",
  "5y": "1wk",
};

const entrySchema = z.object({
  symbol: z.string(),
  previousClose: z.number().optional(),
  chartPreviousClose: z.number().optional(),
  close: z.array(z.number().nullable()).optional(),
  timestamp: z.array(z.number()).optional(),
});

const sparkSchema = z.record(z.string(), z.unknown());

export function sparksFromResponse(raw: unknown): Record<string, SparkSeries> {
  const parsed = sparkSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected spark response");
  const map: Record<string, SparkSeries> = {};
  for (const [symbol, value] of Object.entries(parsed.data)) {
    const entry = entrySchema.safeParse(value);
    if (!entry.success) continue;
    const times = entry.data.timestamp ?? [];
    const points = (entry.data.close ?? []).flatMap((close, index) =>
      close == null ? [] : [{ time: times[index] ?? 0, close }],
    );
    const previousClose =
      entry.data.chartPreviousClose ?? entry.data.previousClose ?? points[0]?.close;
    if (previousClose == null) continue;
    map[symbol] = { symbol, price: points.at(-1)?.close ?? previousClose, previousClose, points };
  }
  return map;
}

export async function fetchSparks(
  symbols: string[],
  range: StockRange,
  signal?: AbortSignal,
): Promise<Record<string, SparkSeries>> {
  if (symbols.length === 0) return {};
  const raw = await fetchYahoo(
    `/v8/finance/spark?symbols=${encodeURIComponent(symbols.join(","))}` +
      `&range=${range}&interval=${SPARK_INTERVAL[range]}`,
    signal,
  );
  return sparksFromResponse(raw);
}

const cachedSparkSchema = z.record(
  z.string(),
  z.object({
    symbol: z.string(),
    price: z.number(),
    previousClose: z.number(),
    points: z.array(z.object({ time: z.number(), close: z.number() })),
  }),
);

export function parseCachedSparks(raw: unknown): Record<string, SparkSeries> | null {
  const result = cachedSparkSchema.safeParse(raw);
  return result.success ? result.data : null;
}
