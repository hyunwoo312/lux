import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { useQuote } from "@/widgets/stocks/hooks/useQuote";
import {
  changeOf,
  directionOf,
  extendedSession,
  referencePrice,
  sparkReference,
  type ChangeDirection,
  type ExtendedSession,
} from "@/widgets/stocks/lib/quote";
import { DAY_RANGE, type PricePoint, type Quote, type SparkSeries } from "@/widgets/stocks/types";

export type StockSummary = {
  state: PolledResourceState<Quote>;
  quote: Quote | null;
  price: number | null;
  reference: number | null;
  change: number;
  percent: number;
  direction: ChangeDirection;
  extended: ExtendedSession | null;
  points: PricePoint[];
};

export function useStockSummary(symbol: string, spark: SparkSeries | undefined): StockSummary {
  const { state, data } = useQuote(symbol, { range: DAY_RANGE });

  const live = spark != null && spark.points.length > 0;
  const price = live ? spark.price : (data?.price ?? spark?.previousClose ?? null);
  const reference = data
    ? referencePrice(data, DAY_RANGE)
    : spark
      ? sparkReference(spark, DAY_RANGE)
      : null;
  const { change, percent } =
    price != null && reference != null ? changeOf(price, reference) : { change: 0, percent: 0 };

  return {
    state,
    quote: data,
    price,
    reference,
    change,
    percent,
    direction: directionOf(change),
    extended: data ? extendedSession(data, Date.now()) : null,
    points: spark?.points ?? data?.bars ?? [],
  };
}
