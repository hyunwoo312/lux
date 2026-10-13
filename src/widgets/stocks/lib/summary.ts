import type { PolledResourceState } from "@/widgets/core/usePolledResource";
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

type StockSummary = {
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

export type SummaryMetadata = {
  quote: Quote | null;
  state: PolledResourceState<Record<string, Quote>>;
};

export function stockSummary(
  spark: SparkSeries | undefined,
  now: number,
  metadata: SummaryMetadata,
): StockSummary {
  const data = metadata.quote;
  const state: PolledResourceState<Quote> = data
    ? { status: "success", data }
    : metadata.state.status === "error"
      ? metadata.state
      : { status: metadata.state.status === "success" ? "empty" : "loading" };

  const live = spark != null && spark.points.length > 0;
  const price = live ? spark.price : (data?.price ?? spark?.previousClose ?? null);
  const reference = live
    ? sparkReference(spark, DAY_RANGE)
    : data
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
    extended: data ? extendedSession(data, now) : null,
    points: spark?.points ?? data?.bars ?? [],
  };
}
