import { z } from "zod";
import { fetchYahoo } from "@/widgets/stocks/lib/yahooApi";
import { INSTRUMENT_TYPES, type SymbolSearchResult } from "@/widgets/stocks/types";

const SEARCHABLE_TYPES = new Set<string>(INSTRUMENT_TYPES);

const searchSchema = z.object({
  quotes: z
    .array(
      z.object({
        symbol: z.string(),
        shortname: z.string().optional(),
        longname: z.string().optional(),
        exchDisp: z.string().optional(),
        quoteType: z.string().optional(),
        sectorDisp: z.string().optional(),
        industryDisp: z.string().optional(),
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
      sector: quote.industryDisp ?? quote.sectorDisp ?? null,
      instrumentType:
        quote.quoteType != null && SEARCHABLE_TYPES.has(quote.quoteType)
          ? (quote.quoteType as SymbolSearchResult["instrumentType"])
          : null,
    }));
}

export async function searchSymbols(
  query: string,
  signal?: AbortSignal,
): Promise<SymbolSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const raw = await fetchYahoo(`/v1/finance/search?q=${encodeURIComponent(trimmed)}`, signal);
  return symbolsFromSearch(raw);
}

const trendingSchema = z.object({
  finance: z.object({
    result: z
      .array(z.object({ quotes: z.array(z.object({ symbol: z.string() })).optional() }))
      .nullable()
      .optional(),
  }),
});

export function trendingFromResponse(raw: unknown): string[] {
  const parsed = trendingSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected trending response");
  return (parsed.data.finance.result?.[0]?.quotes ?? []).map((quote) => quote.symbol);
}

export async function fetchTrendingSymbols(signal?: AbortSignal): Promise<string[]> {
  const raw = await fetchYahoo("/v1/finance/trending/US?count=12", signal);
  return trendingFromResponse(raw);
}

export function parseCachedTrending(raw: unknown): string[] | null {
  const result = z.array(z.string()).safeParse(raw);
  return result.success ? result.data : null;
}
