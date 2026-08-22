export const TREND_REGIONS = [
  { code: "US", label: "United States" },
  { code: "AU", label: "Australia" },
  { code: "BR", label: "Brazil" },
  { code: "CA", label: "Canada" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IN", label: "India" },
  { code: "IE", label: "Ireland" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "MX", label: "Mexico" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
  { code: "NG", label: "Nigeria" },
  { code: "PL", label: "Poland" },
  { code: "SG", label: "Singapore" },
  { code: "ZA", label: "South Africa" },
  { code: "KR", label: "South Korea" },
  { code: "ES", label: "Spain" },
  { code: "SE", label: "Sweden" },
  { code: "GB", label: "United Kingdom" },
] as const;

export type TrendRegion = (typeof TREND_REGIONS)[number]["code"];

export const TREND_REGION_CODES = TREND_REGIONS.map((region) => region.code);

export const DEFAULT_REGION: TrendRegion = "US";

const BY_CODE = new Map(TREND_REGIONS.map((region) => [region.code, region]));

export function regionLabel(code: string): string {
  return BY_CODE.get(code as TrendRegion)?.label ?? code;
}
